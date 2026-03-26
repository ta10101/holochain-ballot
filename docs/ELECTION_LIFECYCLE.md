# Election lifecycle (v1)

Phases are stored on the `Election` entry as `Election.phase` (`ElectionPhase` in the integrity zome). The **canonical election id** for clients is still the **`ActionHash` of the original `create_entry`** (“create action hash”). All coordinator calls that take `election_action` / `election_create_action` expect that **create** hash unless documented otherwise.

## Phases

| Phase | Registration | Voting |
|-------|--------------|--------|
| `active` | Yes | Yes |
| `draft` | No | No |
| `open_registration` | Yes | No |
| `open_voting` | No | Yes |
| `closed` | No | No |

### `active` (default)

Backward-compatible with pre–P1 behavior: **registration and voting are both allowed** without explicit transitions. New elections should prefer the explicit pipeline when you want staged rollout.

## Allowed transitions (creator only)

Only the **election creator** (author of the create action) may call `advance_election_phase`. The call is **optimistic**: the client passes `expected_phase`; if the on-chain latest phase differs (e.g. another advance succeeded), the call fails so the client can refresh and retry.

Valid transitions:

1. `draft` → `open_registration`
2. `open_registration` → `open_voting`
3. `open_voting` → `closed`
4. `active` → `closed` (end a legacy-style election without going through staged phases)

Any other pair is rejected by the coordinator.

## Resolving “current” election state

`create_entry` and subsequent **`update_entry`** calls on the creator’s chain may change serialized election bytes (new entry hash). **Ballot and registration links** stay anchored to the **entry hash from the original create** so existing links remain valid. Coordinator logic loads the **latest** `Election` value by walking the creator’s update chain from the create action (see coordinator zome implementation).

## Payload shape (JSON)

`advance_election_phase`:

```json
{
  "election_create_action": "<ActionHash>",
  "expected_phase": "open_registration",
  "next_phase": "open_voting"
}
```

Phase strings use **snake_case** to match Rust serde: `active`, `draft`, `open_registration`, `open_voting`, `closed`.
