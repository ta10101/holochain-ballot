# Limits and caps (P2)

**P2.3** in [ROADMAP.md](ROADMAP.md). Constants live in the **integrity** zome (`voting_integrity`); the **coordinator** mirrors checks for early errors.

## Global DNA limits (all elections)

| Constant | Value | Applies to |
|----------|-------|------------|
| `MAX_ELECTION_TITLE_BYTES` | 512 | `Election.title` byte length |
| `MAX_ELECTION_OPTIONS` | 64 | Number of options |
| `MAX_OPTION_TEXT_BYTES` | 256 | Each option string byte length |
| `MAX_ALLOWLIST_VOTERS` | 2048 | `allowed_voters` list length when `Some` |
| `MAX_ELECTION_REGISTRATIONS_CAP` | 50_000 | Upper bound for **`Election.max_registrations`** when set |

Minimum election shape: **≥ 2** non-empty options; title non-empty (after trim in coordinator; integrity checks non-empty and bounds).

## Per-election optional limits (P2.3)

These are stored on `Election` and enforced by the coordinator:

| Field | Type | Meaning |
|-------|------|--------|
| `allowed_voters` | `Option<Vec<AgentPubKey>>` | `None` = open registration (subject to phase); `Some` = invite-only |
| `max_registrations` | `Option<u32>` | `None` = no cap; `Some(n)` with **1 ≤ n ≤ MAX_ELECTION_REGISTRATIONS_CAP** = at most **n** distinct agents may register |

**Design note:** `max_registrations` is a light **spam/size** lever (e.g. cap a public poll). It does not prove unique humans. If both allowlist and cap are set, ensure **`n ≥ allowlist.len()`** in your process or some invited agents may be unable to register after others fill the cap—a deployment concern, not enforced by the DNA.

## What is not capped (v1)

- Number of **votes** beyond “one per registrant” (enforced by zome logic, not a numeric cap).
- **Title/options** per-election tightening below globals (not implemented; globals apply to all elections).

Future work could add stricter per-election content caps if pilots need them; document any DNA change in this file and [VOTE_PATH.md](VOTE_PATH.md).
