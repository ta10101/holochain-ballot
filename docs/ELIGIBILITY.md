# Eligibility (v1)

This document matches **P1** in [`ROADMAP.md`](ROADMAP.md).

## Choice for v1: invite-only allowlist

**v1 eligibility** is implemented as an **optional static allowlist** on the election entry: `Election.allowed_voters: Option<Vec<AgentPubKey>>`.

| `allowed_voters` | Meaning |
|------------------|--------|
| `None` (default) | Any agent may **attempt** to register (subject to phase rules below). There is still no proof of unique person; see [`THREAT_MODEL.md`](THREAT_MODEL.md). |
| `Some(keys)` | Only agents whose **initial** pubkey appears in the list may register. |

### Why allowlist (and not a registrar zome) for v1

- **Small pilots / DAOs** already know their member keys or can exchange them out-of-band (chat, org directory, prior membership app).
- **Less code and fewer trust edges** than a dedicated registrar that signs claims or maintains a separate registry entry type.
- **Clear semantics**: the creator sets the list at creation time; the coordinator enforces it at `register_voter`.

### Out of scope for v1

- Rotating or editing the allowlist after creation (would require updates to election semantics or a new entry type).
- Sybil resistance, government ID, or proof-of-personhood—the allowlist only restricts **which Holochain agents** may register, not **how many humans** they represent.

### Limits

- Integrity and coordinator enforce **`MAX_ALLOWLIST_VOTERS`** (2048) to cap entry size and validation work.
