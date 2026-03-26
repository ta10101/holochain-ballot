/**
 * P2: per-election max_registrations cap.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { dhtSync, runScenario } from "@holochain/tryorama";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "../workdir/holochain-ballot.happ");

function cfg(seed) {
  return {
    appBundleSource: { type: "path", value: appPath },
    options: { networkSeed: seed },
  };
}

test("rejects register when max_registrations reached", async () => {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([
      cfg("holochain_ballot_p2_regcap"),
      cfg("holochain_ballot_p2_regcap"),
    ]);
    await scenario.shareAllAgents();

    const electionAh = await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "create_election",
      payload: {
        title: "Cap 1",
        options: ["A", "B"],
        max_registrations: 1,
      },
    });
    const dna = alice.cells.find((c) => c.name === "voting")?.cell_id[0];
    await dhtSync([alice, bob], dna, { interval: 200, timeout: 60_000 });

    await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "register_voter",
      payload: electionAh,
    });
    await dhtSync([alice, bob], dna, { interval: 200, timeout: 60_000 });

    await expect(
      bob.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "register_voter",
        payload: electionAh,
      }),
    ).rejects.toThrow(/registration limit/i);
  });
});
