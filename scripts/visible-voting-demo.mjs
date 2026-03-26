/**
 * Play-by-play Tryorama run in the terminal.
 * Docker: npm run demo:visible
 * Slow down: DEMO_STEP_MS=2000 (see README)
 */
import { defaultAppPath, runVotingDemo } from "./lib/voting-scenario.mjs";

const STEP_MS = Number(process.env.DEMO_STEP_MS ?? "1000");

function banner(title) {
  console.log("\n" + "═".repeat(62));
  console.log(`  ${title}`);
  console.log("═".repeat(62));
}

function note(msg) {
  console.log(`  → ${msg}`);
}

async function main() {
  console.log("\n");
  banner("holochain-ballot — visible demo (real conductors + DNA)");
  const pc = Number(process.env.DEMO_PLAYER_COUNT ?? "2");
  note(
    `This is not the Vite showcase; ${pc} real Holochain node(s) will start (set DEMO_PLAYER_COUNT=2|4).`,
  );
  note(`Pause between beats: ${STEP_MS}ms (set DEMO_STEP_MS to change)`);
  await new Promise((r) => setTimeout(r, STEP_MS));

  const { success, failReason } = await runVotingDemo({
    appPath: defaultAppPath,
    networkSeed: "holochain_ballot_visible_demo",
    stepMs: STEP_MS,
    playerCount: pc === 4 ? 4 : 2,
    hooks: {
      banner,
      note,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      tally: (_label, json) => {
        console.log(json);
      },
      expectedError: (preview) => {
        console.log(preview);
      },
    },
  });

  if (!success) {
    console.error("\nDemo failed:", failReason || "unknown");
    process.exit(1);
  }

  banner("Demo finished OK");
  note("Conductors shut down when this script exits.");
  console.log("");
}

main().catch((e) => {
  console.error("\nDemo failed:", e);
  process.exit(1);
});
