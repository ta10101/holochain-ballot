# Vote path — invariants and edge cases (P2)

This doc satisfies **P2.1** in [ROADMAP.md](ROADMAP.md). Pair it with [TALLY_AUDIT.md](TALLY_AUDIT.md) for recounts and [LIMITS.md](LIMITS.md) for caps.

## Stable identifiers

- **`election_action` / `election_create_action`:** the **`ActionHash` of the original `create_entry`** for the election. Registration, vote, tally, and phase advances all key off this hash (even after the creator updates election state with `update_entry`).
- **Link base:** `VoterRegistration` and `Ballot` links are anchored to the **`EntryHash` from that create action** (not from updated election entry hashes).

## Intended flow

1. **Create** — `create_election` commits an `Election` (see [ELECTION_LIFECYCLE.md](ELECTION_LIFECYCLE.md) for phases).
2. **Register** — `register_voter(election_create_action_hash)` commits `Registration` + link from election base → registration entry.
3. **Vote** — `cast_vote({ election_action, choice_index })` commits `Vote` + ballot link; `choice_index` indexes into **`Election.options` from the latest election state** (coordinator), while integrity still validates range against the **create** record’s entry in the StoreEntry callback (options are not edited in v1 updates, so they stay aligned).
4. **Tally** — `get_tally(election_create_action_hash)` aggregates ballot links and returns counts + `vote_action_hashes`.

## Invariants (coordinator + integrity)

| Invariant | Where enforced |
|-----------|----------------|
| Election has non-empty title, ≥ 2 options, option strings within global bounds | Integrity `Election`; coordinator pre-check |
| `choice_index` ∈ `[0, options.len())` for the referenced election | Integrity `Vote`; coordinator |
| At most **one** `Registration` per agent per election (same initial pubkey as author) | Coordinator (`register_voter`) |
| **Register** before **vote** | Coordinator (`cast_vote`) |
| At most **one** `Vote` per agent per election | Coordinator (`cast_vote`) |
| Phase allows action (`draft` → no register/vote; `open_registration` → register only; `open_voting` → vote only; `closed` → neither; `active` → legacy both) | Coordinator |
| Allowlist: if `Election.allowed_voters` is `Some`, only listed agents may register | Coordinator |
| Registration cap: if `Election.max_registrations` is `Some(n)`, at most **n** distinct registrants | Coordinator (after duplicate check); bounds in integrity |
| Only **election creator** may `advance_election_phase` | Coordinator |
| Phase transitions match the allowed graph in [ELECTION_LIFECYCLE.md](ELECTION_LIFECYCLE.md) | Coordinator |

## Edge cases and failure modes

| Scenario | Expected behavior |
|----------|-------------------|
| Double `register_voter` | Rejected: *already registered*. |
| `cast_vote` without register | Rejected: *register as a voter…*. |
| Second `cast_vote` same agent | Rejected: *already voted*. |
| `cast_vote` wrong phase (e.g. `open_registration`) | Rejected: *voting is not open…*. |
| `register_voter` wrong phase / allowlist / cap | Rejected with corresponding guest error. |
| Wrong `expected_phase` on `advance_election_phase` | Rejected: phase changed (optimistic lock). |
| Non-creator calls `advance_election_phase` | Rejected. |
| Stale election options | v1 does not mutate `options` after create; if that changes in a future version, recount docs must be updated. |
| Split-brain / partial gossip | Like any DHT app: tallies reflect what the querying peer can **Get** over the network; operators should sync conductors before trusting a snapshot. |

## Explicit non-goals (v1)

- **Secret ballot** — votes are linkable to agents via DHT data relevant to validation; see [SCOPE.md](SCOPE.md#secret-ballot--high-stakes-track--go-no-go-p52) (**NO-GO** for alternate DNA here) and [SECRET_BALLOT_RESEARCH.md](SECRET_BALLOT_RESEARCH.md) (P5.1).
- **One-human-one-vote** — agents are keys; see [ELIGIBILITY.md](ELIGIBILITY.md) / [THREAT_MODEL.md](THREAT_MODEL.md).
