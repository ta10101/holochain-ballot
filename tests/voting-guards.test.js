/**
 * Coordinator rules: duplicate registration, vote without registration.
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

test("rejects second register_voter for same agent", async () => {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([
      cfg("holochain_ballot_guards_double_reg"),
      cfg("holochain_ballot_guards_double_reg"),
    ]);
    await scenario.shareAllAgents();
    const electionAh = await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "create_election",
      payload: { title: "T", options: ["A", "B"] },
    });
    const dna = alice.cells.find((c) => c.name === "voting")?.cell_id[0];
    await dhtSync([alice, bob], dna, { interval: 200, timeout: 60_000 });

    await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "register_voter",
      payload: electionAh,
    });
    await expect(
      alice.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "register_voter",
        payload: electionAh,
      }),
    ).rejects.toThrow(/already registered/i);
  });
});

test("rejects cast_vote without register_voter", async () => {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([
      cfg("holochain_ballot_guards_no_vote"),
      cfg("holochain_ballot_guards_no_vote"),
    ]);
    await scenario.shareAllAgents();
    const electionAh = await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "create_election",
      payload: { title: "T", options: ["A", "B"] },
    });
    const dna = alice.cells.find((c) => c.name === "voting")?.cell_id[0];
    await dhtSync([alice, bob], dna, { interval: 200, timeout: 60_000 });

    await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "register_voter",
      payload: electionAh,
    });
    await expect(
      bob.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "cast_vote",
        payload: { election_action: electionAh, choice_index: 0 },
      }),
    ).rejects.toThrow(/register as a voter/i);
  });
});
