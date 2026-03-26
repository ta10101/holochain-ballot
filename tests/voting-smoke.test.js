/**
 * Smoke test: one conductor, election, two voters, tally + duplicate-vote rejection.
 * Run locally: nix develop → npm test
 * Run in Docker: npm run docker:test
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { dhtSync, runScenario } from "@holochain/tryorama";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "../workdir/holochain-ballot.happ");

const playerConfig = {
  appBundleSource: { type: "path", value: appPath },
  options: {
    networkSeed: "holochain_ballot_tryorama",
  },
};

test("holochain-ballot: register, vote, tally, reject double vote", async () => {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([
      playerConfig,
      playerConfig,
    ]);
    await scenario.shareAllAgents();

    const electionAh = await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "create_election",
      payload: {
        title: "Snack preference",
        options: ["Pizza", "Tacos", "Sushi"],
      },
    });
    expect(electionAh).toBeTruthy();

    const dna = alice.cells.find((c) => c.name === "voting")?.cell_id[0];
    expect(dna).toBeDefined();
    await dhtSync([alice, bob], dna, { interval: 200, timeout: 60_000 });

    await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "register_voter",
      payload: electionAh,
    });
    await bob.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "register_voter",
      payload: electionAh,
    });

    await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "cast_vote",
      payload: { election_action: electionAh, choice_index: 0 },
    });
    await bob.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "cast_vote",
      payload: { election_action: electionAh, choice_index: 2 },
    });

    await dhtSync([alice, bob], dna, { interval: 200, timeout: 60_000 });

    const tallyAlice = await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "get_tally",
      payload: electionAh,
    });
    expect(tallyAlice.title).toBe("Snack preference");
    expect(tallyAlice.options).toEqual(["Pizza", "Tacos", "Sushi"]);
    expect(tallyAlice.counts).toEqual([1, 0, 1]);
    expect(tallyAlice.vote_action_hashes.length).toBe(2);

    await expect(
      alice.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "cast_vote",
        payload: { election_action: electionAh, choice_index: 1 },
      }),
    ).rejects.toThrow();

    const tallyBob = await bob.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "get_tally",
      payload: electionAh,
    });
    expect(tallyBob.counts).toEqual([1, 0, 1]);
  });
});
