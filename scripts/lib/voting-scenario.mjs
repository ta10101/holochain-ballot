/**
 * Shared Tryorama flow: N conductors (2 or 4), election, votes, tally, double-vote rejection.
 * Used by visible terminal demo, browser dashboard, and tests (tests may inline a smaller flow).
 *
 * By default the demo uses a **phased lifecycle** (draft → open_registration → open_voting) via
 * `advance_election_phase`. Set `usePhasedLifecycle: false` for the legacy “active” single-phase flow.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { dhtSync, runScenario } from "@holochain/tryorama";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const defaultAppPath = path.join(__dirname, "../../workdir/holochain-ballot.happ");

/** Showcase InteractiveVoteLab names for four-player demos */
export const NAMES_FOUR = ["Alex", "Blake", "Casey", "Dana"];
export const NAMES_TWO = ["Alice", "Bob"];

export function fmtHash(h) {
  if (h == null) return String(h);
  if (typeof h === "object" && h.type === "Buffer" && Array.isArray(h.data)) {
    return Buffer.from(h.data).toString("base64");
  }
  if (Buffer.isBuffer(h)) return h.toString("base64");
  if (h instanceof Uint8Array) return Buffer.from(h).toString("base64");
  if (typeof h === "string") return h;
  return JSON.stringify(h);
}

export function tallyToPlain(tally) {
  return JSON.parse(
    JSON.stringify(tally, (_k, v) => {
      if (typeof v === "bigint") return v.toString();
      if (v && typeof v === "object" && v.type === "Buffer" && Array.isArray(v.data)) {
        return `0x${Buffer.from(v.data).toString("hex")}`;
      }
      if (v instanceof Uint8Array) return `0x${Buffer.from(v).toString("hex")}`;
      return v;
    }),
  );
}

export function fmtTally(tally) {
  return JSON.stringify(tallyToPlain(tally), null, 2);
}

/**
 * @param {object} opts
 * @param {string} opts.appPath
 * @param {string} [opts.networkSeed]
 * @param {number} [opts.stepMs]
 * @param {2|4} [opts.playerCount]
 * @param {() => void | Promise<void>} [opts.stepPause] If set, called between phases instead of sleep(stepMs)
 * @param {object} opts.hooks
 * @param {(title: string) => void | Promise<void>} [opts.hooks.banner]
 * @param {(msg: string) => void | Promise<void>} [opts.hooks.note]
 * @param {(label: string, json: string) => void | Promise<void>} [opts.hooks.tally]
 * @param {(preview: string) => void | Promise<void>} [opts.hooks.expectedError]
 * @param {() => void | Promise<void>} [opts.hooks.sleep]
 * @param {boolean} [opts.usePhasedLifecycle=true] Use `create_election` with `draft` and call `advance_election_phase` before register/vote.
 */
export async function runVotingDemo(opts) {
  const {
    appPath = defaultAppPath,
    networkSeed = "holochain_ballot_demo",
    stepMs = Number(process.env.DEMO_STEP_MS ?? "1000"),
    playerCount = Number(process.env.DEMO_PLAYER_COUNT ?? "2"),
    stepPause = null,
    hooks = {},
    usePhasedLifecycle: usePhasedLifecycleOpt,
  } = opts;

  const usePhasedLifecycle =
    usePhasedLifecycleOpt !== undefined
      ? usePhasedLifecycleOpt
      : process.env.DEMO_LEGACY_FLOW !== "1";

  if (playerCount !== 2 && playerCount !== 4) {
    throw new Error("runVotingDemo: playerCount must be 2 or 4");
  }

  const names = playerCount === 4 ? NAMES_FOUR : NAMES_TWO;
  /** choice_index per player (Pizza=0, Tacos=1, Sushi=2) */
  const voteChoices =
    playerCount === 4
      ? [
          { choice: 0, label: "Pizza" },
          { choice: 2, label: "Sushi" },
          { choice: 1, label: "Tacos" },
          { choice: 0, label: "Pizza" },
        ]
      : [
          { choice: 0, label: "Pizza" },
          { choice: 2, label: "Sushi" },
        ];
  const expectedCounts = playerCount === 4 ? "2,1,1" : "1,0,1";

  const banner = hooks.banner ?? (() => {});
  const note = hooks.note ?? (() => {});
  const tallyHook = hooks.tally ?? (() => {});
  const expectedErrorHook = hooks.expectedError ?? (() => {});
  const sleep = hooks.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));

  const pause = async () => {
    if (typeof stepPause === "function") await stepPause();
    else await sleep(stepMs);
  };

  let success = true;
  let failReason = "";

  await runScenario(async (scenario) => {
    const listLabel = names.join(", ");
    await banner(`1) Starting ${playerCount} players (${listLabel}), each with the hApp installed`);
    const configs = Array.from({ length: playerCount }, () => ({
      appBundleSource: { type: "path", value: appPath },
      options: { networkSeed },
    }));
    const players = await scenario.addPlayersWithApps(configs);
    await scenario.shareAllAgents();
    const first = players[0];
    const last = players[players.length - 1];

    await note(`${names.join(" and ")} each run their own conductor + lair + copy of the app.`);
    await pause();

    const createPayload = usePhasedLifecycle
      ? {
          title: "Snack preference",
          options: ["Pizza", "Tacos", "Sushi"],
          phase: "draft",
        }
      : {
          title: "Snack preference",
          options: ["Pizza", "Tacos", "Sushi"],
        };

    await banner(
      usePhasedLifecycle
        ? "2) First player creates an election (phase: draft — registration/voting closed until advanced)"
        : "2) First player creates an election on their node",
    );
    const electionAh = await first.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "create_election",
      payload: createPayload,
    });
    await note(`Election create action hash (base64, ${names[0]}'s chain): ${fmtHash(electionAh)}`);
    await pause();

    const dna = first.cells.find((c) => c.name === "voting")?.cell_id[0];
    if (!dna) throw new Error("Could not find voting cell");

    await banner("3) DHT sync — every peer learns about the election from the network");
    await note("Waiting for gossip so all nodes can register and vote against the same election…");
    await dhtSync(players, dna, { interval: 200, timeout: 60_000 });
    await note("Sync complete.");
    await pause();

    if (usePhasedLifecycle) {
      await banner("4) Creator advances phase: draft → open_registration");
      await first.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "advance_election_phase",
        payload: {
          election_create_action: electionAh,
          expected_phase: "draft",
          next_phase: "open_registration",
        },
      });
      await note(`${names[0]} called advance_election_phase (only the creator may do this).`);
      await pause();

      await banner("5) DHT sync — peers see updated election phase");
      await dhtSync(players, dna, { interval: 200, timeout: 60_000 });
      await note("Sync complete.");
      await pause();
    }

    await banner(
      usePhasedLifecycle
        ? `6) All ${playerCount} players register (phase is open_registration)`
        : `4) All ${playerCount} players register as voters`,
    );
    for (let i = 0; i < players.length; i++) {
      await players[i].appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "register_voter",
        payload: electionAh,
      });
      await note(`${names[i]} registered.`);
    }
    await pause();

    if (usePhasedLifecycle) {
      await banner("7) Creator advances phase: open_registration → open_voting");
      await first.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "advance_election_phase",
        payload: {
          election_create_action: electionAh,
          expected_phase: "open_registration",
          next_phase: "open_voting",
        },
      });
      await note("Voting is now allowed; registration is closed for new sign-ups in this phase.");
      await pause();

      await banner("8) DHT sync after phase change");
      await dhtSync(players, dna, { interval: 200, timeout: 60_000 });
      await note("Sync complete.");
      await pause();
    }

    const voteSummary = voteChoices.map((v, i) => `${names[i]} → ${v.label}`).join("; ");
    await banner(
      usePhasedLifecycle ? `9) Cast votes — ${voteSummary}` : `5) Cast votes — ${voteSummary}`,
    );
    for (let i = 0; i < players.length; i++) {
      await players[i].appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "cast_vote",
        payload: { election_action: electionAh, choice_index: voteChoices[i].choice },
      });
      await note(`${names[i]}'s vote committed + linked on the DHT.`);
    }
    await pause();

    await banner(
      usePhasedLifecycle
        ? "10) DHT sync again so all nodes see every vote"
        : "6) DHT sync again so all nodes see every vote",
    );
    await dhtSync(players, dna, { interval: 200, timeout: 60_000 });
    await note("Done.");
    await pause();

    await banner(
      usePhasedLifecycle
        ? `11) Tally — ${names[0]} reads counts + vote receipts from the network`
        : `7) Tally — ${names[0]} reads counts + vote receipts from the network`,
    );
    const tallyFirst = await first.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "get_tally",
      payload: electionAh,
    });
    await tallyHook(`${names[0]}'s tally`, fmtTally(tallyFirst), tallyToPlain(tallyFirst));
    await pause();

    await banner(
      usePhasedLifecycle
        ? `12) ${names[0]} tries to vote again — coordinator must reject (one vote per agent)`
        : `8) ${names[0]} tries to vote again — coordinator must reject (one vote per agent)`,
    );
    let secondVoteError = null;
    try {
      await first.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "cast_vote",
        payload: { election_action: electionAh, choice_index: 1 },
      });
    } catch (e) {
      secondVoteError = e;
    }
    if (!secondVoteError) {
      success = false;
      failReason = "Second vote should have failed";
      return;
    }
    await note("Rejected as expected. Message (trimmed):");
    const msg = String(secondVoteError?.message || secondVoteError);
    const preview = msg.slice(0, 400) + (msg.length > 400 ? "…" : "");
    await expectedErrorHook(preview);
    await pause();

    await banner(
      usePhasedLifecycle
        ? `13) ${names[names.length - 1]}'s tally matches (same replicated data)`
        : `9) ${names[names.length - 1]}'s tally matches (same replicated data)`,
    );
    const tallyLast = await last.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "get_tally",
      payload: electionAh,
    });
    await tallyHook(`${names[names.length - 1]}'s tally`, fmtTally(tallyLast), tallyToPlain(tallyLast));

    if (
      tallyFirst.counts?.join(",") !== expectedCounts ||
      tallyLast.counts?.join(",") !== expectedCounts
    ) {
      success = false;
      failReason = "Unexpected tally counts";
    }
  });

  return { success, failReason };
}
