/**
 * Minimal real-client flow against a local conductor:
 * install app -> create election -> register -> vote -> tally.
 *
 * Usage (example):
 *   npm run client:minimal
 *
 * Env overrides:
 *   HC_ADMIN_URL=ws://127.0.0.1:65000
 *   HC_APP_PORT=65001
 *   HC_HAPP_PATH=./workdir/holochain-ballot.happ
 *   HC_ROLE_NAME=voting
 *   HC_ZOME_NAME=voting
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AdminWebsocket, AppWebsocket, CellType } from "@holochain/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const ADMIN_URL = new URL(process.env.HC_ADMIN_URL ?? "ws://127.0.0.1:65000");
const APP_PORT = Number(process.env.HC_APP_PORT ?? "65001");
const HAPP_PATH = process.env.HC_HAPP_PATH ?? path.join(root, "workdir/holochain-ballot.happ");
const ROLE_NAME = process.env.HC_ROLE_NAME ?? "voting";
const ZOME_NAME = process.env.HC_ZOME_NAME ?? "voting";
const ORIGIN = "holochain-ballot-minimal-client";
const APP_ID = `holochain-ballot-minimal-${Date.now()}`;

function die(msg) {
  throw new Error(msg);
}

function log(event, fields = {}) {
  const entry = {
    ts: new Date().toISOString(),
    event,
    ...fields,
  };
  console.log(JSON.stringify(entry));
}

function normalizeError(err, stage) {
  const raw = String(err?.message || err || "");
  const out = {
    stage,
    code: "UNKNOWN",
    message: raw,
  };
  if (/already registered/i.test(raw)) out.code = "ALREADY_REGISTERED";
  else if (/already voted/i.test(raw)) out.code = "ALREADY_VOTED";
  else if (/register as a voter/i.test(raw)) out.code = "NOT_REGISTERED";
  else if (/allowlist/i.test(raw)) out.code = "NOT_ALLOWLISTED";
  else if (/registration limit/i.test(raw)) out.code = "REGISTRATION_LIMIT";
  else if (/phase/i.test(raw)) out.code = "PHASE_BLOCKED";
  else if (/choice_index/i.test(raw)) out.code = "CHOICE_OUT_OF_RANGE";
  return out;
}

async function callZome(app, stage, req) {
  try {
    log("zome_call_start", { stage, fn_name: req.fn_name });
    const out = await app.callZome(req);
    log("zome_call_ok", { stage, fn_name: req.fn_name });
    return out;
  } catch (e) {
    const normalized = normalizeError(e, stage);
    log("zome_call_error", { fn_name: req.fn_name, ...normalized });
    throw new Error(`${normalized.code}: ${normalized.message}`);
  }
}

async function main() {
  let admin = null;
  let app = null;
  let stage = "boot";
  try {
    log("client_start", {
      admin_url: ADMIN_URL.toString(),
      happ_path: HAPP_PATH,
      app_id: APP_ID,
      role_name: ROLE_NAME,
      zome_name: ZOME_NAME,
    });

    stage = "connect_admin";
    admin = await AdminWebsocket.connect({
      url: ADMIN_URL,
      wsClientOptions: { origin: ORIGIN },
    });

    stage = "generate_agent";
    const agent_key = await admin.generateAgentPubKey();
    log("agent_generated");

    stage = "install_app";
    const appInfo = await admin.installApp({
      source: { type: "path", value: HAPP_PATH },
      installed_app_id: APP_ID,
      agent_key,
    });
    stage = "enable_app";
    await admin.enableApp({ installed_app_id: APP_ID });

    stage = "resolve_cell";
    const cellInfo = appInfo.cell_info?.[ROLE_NAME]?.[0];
    if (!cellInfo || cellInfo.type !== CellType.Provisioned) {
      die(`No provisioned cell found under role_name='${ROLE_NAME}'`);
    }
    const { cell_id } = cellInfo.value;
    stage = "authorize_signing";
    await admin.authorizeSigningCredentials(cell_id);
    stage = "attach_interface";
    await admin.attachAppInterface({
      port: APP_PORT,
      allowed_origins: ORIGIN,
    });
    stage = "issue_token";
    const issued = await admin.issueAppAuthenticationToken({
      installed_app_id: APP_ID,
    });

    stage = "connect_app";
    app = await AppWebsocket.connect({
      url: new URL(`ws://127.0.0.1:${APP_PORT}`),
      token: issued.token,
      wsClientOptions: { origin: ORIGIN },
    });

    const electionAh = await callZome(app, "create_election", {
      role_name: ROLE_NAME,
      zome_name: ZOME_NAME,
      fn_name: "create_election",
      payload: {
        title: "Minimal client poll",
        options: ["Yes", "No"],
      },
    });
    log("election_created", { election_action: electionAh });

    await callZome(app, "register_voter", {
      role_name: ROLE_NAME,
      zome_name: ZOME_NAME,
      fn_name: "register_voter",
      payload: electionAh,
    });

    await callZome(app, "cast_vote", {
      role_name: ROLE_NAME,
      zome_name: ZOME_NAME,
      fn_name: "cast_vote",
      payload: {
        election_action: electionAh,
        choice_index: 0,
      },
    });

    const tally = await callZome(app, "get_tally", {
      role_name: ROLE_NAME,
      zome_name: ZOME_NAME,
      fn_name: "get_tally",
      payload: electionAh,
    });
    log("tally", { tally });
    log("client_done");
  } finally {
    if (app) await app.client.close();
    if (admin) await admin.client.close();
  }
}

main().catch((e) => {
  const normalized = normalizeError(e, "main");
  console.error(JSON.stringify({ ts: new Date().toISOString(), event: "client_failed", ...normalized }));
  process.exit(1);
});
