/**
 * P1: allowlist, phased lifecycle, advance_election_phase (creator-only).
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

function votingAgentPubKey(player) {
  const cell = player.cells.find((c) => c.name === "voting");
  if (!cell) throw new Error("missing voting cell");
  return cell.cell_id[1];
}

test("rejects register when not on allowlist", async () => {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([
      cfg("holochain_ballot_p1_allowlist"),
      cfg("holochain_ballot_p1_allowlist"),
    ]);
    await scenario.shareAllAgents();
    const alicePk = votingAgentPubKey(alice);
    const electionAh = await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "create_election",
      payload: {
        title: "Invite only",
        options: ["A", "B"],
        phase: "active",
        allowed_voters: [alicePk],
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

    await expect(
      bob.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "register_voter",
        payload: electionAh,
      }),
    ).rejects.toThrow(/allowlist/i);
  });
});

test("rejects register in draft phase", async () => {
  await runScenario(async (scenario) => {
    const [alice] = await scenario.addPlayersWithApps([cfg("holochain_ballot_p1_draft")]);
    const electionAh = await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "create_election",
      payload: {
        title: "Draft poll",
        options: ["A", "B"],
        phase: "draft",
      },
    });
    await expect(
      alice.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "register_voter",
        payload: electionAh,
      }),
    ).rejects.toThrow(/registration is not open/i);
  });
});

test("lifecycle: draft → register → vote → closed rejects vote", async () => {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([
      cfg("holochain_ballot_p1_lifecycle"),
      cfg("holochain_ballot_p1_lifecycle"),
    ]);
    await scenario.shareAllAgents();
    const electionAh = await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "create_election",
      payload: {
        title: "Staged",
        options: ["A", "B"],
        phase: "draft",
      },
    });
    const dna = alice.cells.find((c) => c.name === "voting")?.cell_id[0];
    await dhtSync([alice, bob], dna, { interval: 200, timeout: 60_000 });

    await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "advance_election_phase",
      payload: {
        election_create_action: electionAh,
        expected_phase: "draft",
        next_phase: "open_registration",
      },
    });

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

    await dhtSync([alice, bob], dna, { interval: 200, timeout: 60_000 });

    await expect(
      alice.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "cast_vote",
        payload: { election_action: electionAh, choice_index: 0 },
      }),
    ).rejects.toThrow(/voting is not open/i);

    await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "advance_election_phase",
      payload: {
        election_create_action: electionAh,
        expected_phase: "open_registration",
        next_phase: "open_voting",
      },
    });

    await dhtSync([alice, bob], dna, { interval: 200, timeout: 60_000 });

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
      payload: { election_action: electionAh, choice_index: 1 },
    });

    await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "advance_election_phase",
      payload: {
        election_create_action: electionAh,
        expected_phase: "open_voting",
        next_phase: "closed",
      },
    });

    await dhtSync([alice, bob], dna, { interval: 200, timeout: 60_000 });

    await expect(
      alice.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "cast_vote",
        payload: { election_action: electionAh, choice_index: 0 },
      }),
    ).rejects.toThrow(/voting is not open/i);
  });
});

test("non-creator cannot advance_election_phase", async () => {
  await runScenario(async (scenario) => {
    const [alice, bob] = await scenario.addPlayersWithApps([
      cfg("holochain_ballot_p1_adv"),
      cfg("holochain_ballot_p1_adv"),
    ]);
    await scenario.shareAllAgents();
    const electionAh = await alice.appWs.callZome({
      role_name: "voting",
      zome_name: "voting",
      fn_name: "create_election",
      payload: {
        title: "Admin test",
        options: ["A", "B"],
        phase: "draft",
      },
    });
    const dna = alice.cells.find((c) => c.name === "voting")?.cell_id[0];
    await dhtSync([alice, bob], dna, { interval: 200, timeout: 60_000 });

    await expect(
      bob.appWs.callZome({
        role_name: "voting",
        zome_name: "voting",
        fn_name: "advance_election_phase",
        payload: {
          election_create_action: electionAh,
          expected_phase: "draft",
          next_phase: "open_registration",
        },
      }),
    ).rejects.toThrow(/only the election creator/i);
  });
});
