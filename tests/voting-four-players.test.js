/**
 * Four conductors: same flow as dashboard default (Alex/Blake/Casey/Dana-style votes).
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { dhtSync, runScenario } from "@holochain/tryorama";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appPath = path.join(__dirname, "../workdir/holochain-ballot.happ");

const playerConfig = {
  appBundleSource: { type: "path", value: appPath },
  options: { networkSeed: "holochain_ballot_tryorama_four" },
};

test("holochain-ballot: four players, tally 2-1-1, reject double vote", async () => {
  await runScenario(async (scenario) => {
    const players = await scenario.addPlayersWithApps([
      playerConfig,
      playerConfig,
      playerConfig,
      playerConfig,
    ]);
    await scenario.shareAllAgents();
    const [a, b, c, d] = players;

    const electionAh = await a.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "create_election",
      payload: {
        title: "Snack preference",
        options: ["Pizza", "Tacos", "Sushi"],
      },
    });

    const dna = a.cells.find((cell) => cell.name === "voting")?.cell_id[0];
    expect(dna).toBeDefined();
    await dhtSync(players, dna, { interval: 200, timeout: 60_000 });

    for (const p of players) {
      await p.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "register_voter",
        payload: electionAh,
      });
    }

    const votes = [
      [a, 0],
      [b, 2],
      [c, 1],
      [d, 0],
    ];
    for (const [p, idx] of votes) {
      await p.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "cast_vote",
        payload: { election_action: electionAh, choice_index: idx },
      });
    }

    await dhtSync(players, dna, { interval: 200, timeout: 60_000 });

    const tallyA = await a.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "get_tally",
      payload: electionAh,
    });
    expect(tallyA.counts).toEqual([2, 1, 1]);
    expect(tallyA.vote_action_hashes.length).toBe(4);

    await expect(
      a.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "cast_vote",
        payload: { election_action: electionAh, choice_index: 1 },
      }),
    ).rejects.toThrow();
  });
});
