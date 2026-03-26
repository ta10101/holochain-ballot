/**
 * Browser UI for the live Tryorama voting scenario.
 * Serves demo-dashboard/public/index.html and streams progress via SSE.
 *
 * Prefer path mode (query strings are sometimes dropped from EventSource):
 *   GET /events/auto/4   GET /events/manual/4   (and /2)
 * Fallback: GET /events?step=manual&players=4
 *
 * Auto pacing: no artificial delays (only real conductor/DHT time), unless
 * DEMO_AUTO_STEP_MS is set. Manual still uses POST/GET /advance between phases.
 *
 * Docker: npm run demo:dashboard
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultAppPath, runVotingDemo } from "./lib/voting-scenario.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "../demo-dashboard/public");
const PORT = Number(process.env.DEMO_DASHBOARD_PORT ?? "3456");

let running = false;
/** @type {{ advance: () => void } | null} */
let activeManualGate = null;

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

function log(event, fields = {}) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      event,
      ...fields,
    }),
  );
}

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function createManualGate() {
  /** @type {Array<() => void>} */
  const queue = [];
  return {
    wait() {
      return new Promise((resolve) => {
        queue.push(resolve);
      });
    },
    advance() {
      const next = queue.shift();
      if (next) next();
    },
  };
}

function corsAdvanceHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

  if (req.method === "OPTIONS" && url.pathname === "/advance") {
    res.writeHead(204, corsAdvanceHeaders());
    res.end();
    return;
  }

  if ((req.method === "POST" || req.method === "GET") && url.pathname === "/advance") {
    if (!activeManualGate) {
      res.writeHead(409, {
        "Content-Type": "text/plain; charset=utf-8",
        ...corsAdvanceHeaders(),
      });
      res.end("No demo step is waiting for advance.");
      return;
    }
    activeManualGate.advance();
    res.writeHead(204, corsAdvanceHeaders()).end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/") {
    try {
      const html = fs.readFileSync(path.join(publicDir, "index.html"), "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    } catch (e) {
      res.writeHead(500).end(String(e));
    }
    return;
  }

  const eventsPath = url.pathname.match(/^\/events(?:\/([^/]+)(?:\/([^/]+))?)?$/);
  if (req.method === "GET" && eventsPath) {
    let stepMode = (url.searchParams.get("step") || "auto").toLowerCase();
    let playersRaw = url.searchParams.get("players") || "4";
    if (eventsPath[1] === "manual" || eventsPath[1] === "auto") {
      stepMode = eventsPath[1];
    }
    if (eventsPath[2] === "2" || eventsPath[2] === "4") {
      playersRaw = eventsPath[2];
    }

    const manualStep = stepMode === "manual";
    const playerCount = playersRaw === "2" ? 2 : 4;
    /** Auto: no extra sleeps between phases (IRL). Optional DEMO_AUTO_STEP_MS for demos. */
    const stepMsForRun = manualStep
      ? 0
      : Number(process.env.DEMO_AUTO_STEP_MS ?? "0");

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    });
    // Defeat proxy/browser buffering of the first small SSE chunks (terminal + await_advance).
    res.write(`: ${" ".repeat(2048)}\n\n`);

    if (running) {
      sendSse(res, "busy", {
        message: "A demo run is already in progress. Wait and refresh.",
      });
      res.end();
      return;
    }
    running = true;

    const gate = manualStep ? createManualGate() : null;
    if (gate) activeManualGate = gate;

    (async () => {
      try {
        sendSse(res, "intro", {
          title: "Starting live run",
          body: `${playerCount} Holochain conductor(s), your packaged .happ, DHT sync, zome calls, and tally. The scenario uses election phases (draft → open_registration → open_voting) via advance_election_phase unless DEMO_LEGACY_FLOW=1. ${
            manualStep
              ? "Manual: use Next step in the browser after each pause."
              : "Auto: natural pace only (no artificial delays between steps)."
          }`,
          playerCount,
          manualStep,
        });

        if (manualStep && gate) {
          sendSse(res, "await_advance", {
            message: "Click “Next step” to boot conductors and begin the scenario.",
          });
          await gate.wait();
        }

        const result = await runVotingDemo({
          appPath: defaultAppPath,
          networkSeed: `holochain_ballot_dash_${Date.now()}`,
          stepMs: stepMsForRun,
          playerCount,
          stepPause:
            manualStep && gate
              ? async () => {
                  sendSse(res, "await_advance", {
                    message: "Click “Next step” to continue.",
                  });
                  await gate.wait();
                }
              : null,
          hooks: {
            banner: async (title) => {
              sendSse(res, "banner", { title });
            },
            note: async (msg) => {
              sendSse(res, "note", { msg });
            },
            sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
            tally: async (label, json, plain) => {
              sendSse(res, "tally", { label, json, plain });
            },
            expectedError: async (preview) => {
              sendSse(res, "expected_error", {
                preview,
                code: normalizeError(preview, "scenario_expected_error").code,
              });
            },
          },
        });

        sendSse(res, "done", {
          ok: result.success,
          failReason: result.failReason || "",
        });
      } catch (e) {
        const normalized = normalizeError(e, "scenario");
        log("dashboard_fatal", normalized);
        sendSse(res, "fatal", normalized);
      } finally {
        activeManualGate = null;
        res.end();
        running = false;
      }
    })();
    return;
  }

  res.writeHead(404).end("Not found");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`holochain-ballot demo dashboard → http://localhost:${PORT}/`);
  console.log("Choose step mode and player count on the page, then start the demo.");
});
