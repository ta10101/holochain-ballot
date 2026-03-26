# Capabilities / roles (v1)

Minimal **role model** for the voting coordinator zome. Capabilities are enforced **only inside coordinator functions** (not Holochain capability tokens unless you add them in a later change).

## Roles

| Role | Who |
|------|-----|
| **Election creator** | `agent_initial_pubkey` equals the **author** of the election’s **create** action. |
| **Voter** | Any agent that successfully called `register_voter` for that election (and passes phase + allowlist checks). |
| **Reader** | Any agent that can call read-only functions; in v1 there is no extra gate on `get_tally`. |

## Zome functions

| Function | Creator | Other agents |
|----------|---------|--------------|
| `create_election` | Caller becomes creator for that election. | Same. |
| `advance_election_phase` | Required. | Rejected. |
| `register_voter` | Allowed when phase + allowlist + optional `max_registrations` permit. | Same. |
| `cast_vote` | Allowed when phase permits and registered. | Same. |
| `get_tally` | Allowed. | Allowed. |

## Notes

- **Registrar / admin delegation** is not implemented in v1; only the creator advances phases.
- Stricter **cap grants** (who may call which zome fn at the conductor layer) can be layered later without changing this table’s *semantic* rules.
