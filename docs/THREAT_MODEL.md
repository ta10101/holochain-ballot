# Threat model — holochain-ballot (high level)

This is a **practical sketch**, not a formal security audit. It helps readers decide whether this hApp fits their situation. For scope and non-goals, see [SCOPE.md](SCOPE.md).

## What Holochain *does* give you (in this design)

- **Shared rules:** Integrity WASM runs on all validators; invalid entries should be rejected consistently.
- **Signed actions:** Votes and related actions are attributable to **agent keys** (author of the create action).
- **Replication:** Published election and vote data is gossiped; tallies are derived from **links** anyone can query under the same rules.
- **Immutability of history:** Old actions are not erased; new actions may supersede or add policy only if the DNA is evolved and redeployed.

## What Holochain *does not* magically solve

- **Proving a key is one unique human** (Sybil resistance). That requires process, credentials, or trusted registries—**not** provided by this repo today.
- **Secret ballots** in the strong civic sense. Current tallies are built from **observable** ballot links and vote entries appropriate for **transparency**, not for mandated secrecy.
- **Legal validity** of an outcome. Courts and statutes define what counts; software only encodes rules you put in.

## Threats and mitigations (current state)

### 1. Sybil / duplicate identities

**Risk:** One person operates many agents; without eligibility controls, they might register and vote multiple times if policy allowed it.

**Current mitigation:** **One vote per agent** per election (coordinator checks existing ballot links for the same author). **Not** one vote per human.

**Gap:** **Binding an agent key to one human** is still organizational; v1 patterns (allowlist, registrar) are in [ELIGIBILITY.md](ELIGIBILITY.md).

### 2. Device and key compromise

**Risk:** Malware or theft of a device could sign votes as the victim’s agent.

**Mitigation in DNA:** None specific; this is **endpoint security** and Holochain app UX (passphrases, device policies).

**Gap:** Hardening is deployment-specific; see [CLIENT_INTEGRATION.md](CLIENT_INTEGRATION.md) and [OPERATIONS.md](OPERATIONS.md) for real-conductor setup (P4).

### 3. DHT visibility

**Risk:** Anyone with appropriate network access may learn **who voted** and **how**, given transparent links and entries.

**Current design:** **Intentionally transparent** for auditability demos.

**Gap:** If secrecy is required, you need a **different architecture**. Background: [SECRET_BALLOT_RESEARCH.md](SECRET_BALLOT_RESEARCH.md); this repo’s decision is **NO-GO** for that DNA path ([SCOPE.md](SCOPE.md))—not a tweak to this tally path.

### 4. Coordinator logic trust

**Risk:** Coordinator zome code enforces register-before-vote, duplicate registration, and duplicate vote checks. Bugs or consensus issues could, in theory, affect outcomes.

**Mitigation:** Tests + integrity validation on stored entry shapes; **peer validation** still applies to published data.

**Gap:** Formal review, fuzzing, and external audit for high-stakes use—not done here.

### 5. Election administration

**Risk:** Misconfigured capabilities or clients could let the wrong callers create elections or advance phases.

**Current state:** Phased lifecycle and role rules are implemented and documented ([ELECTION_LIFECYCLE.md](ELECTION_LIFECYCLE.md), [CAPABILITIES.md](CAPABILITIES.md)); in deployment, **whoever can call zomes** depends on your capability matrix.

**Gap:** Your conductor/app setup must match your governance intent—verify per pilot.

### 6. Denial of service / spam

**Risk:** Large titles, many options, or many registrations/votes could stress nodes.

**Current mitigation:** **Caps** on election fields and optional per-election **`max_registrations`** ([LIMITS.md](LIMITS.md)).

**Gap:** Rate limits or other anti-abuse controls if patterns of abuse appear beyond these caps.

## Summary table

| Concern | Addressed today? | Notes |
|--------|-------------------|--------|
| Double voting (same agent) | Yes | Coordinator + links |
| Duplicate registration (same agent) | Yes | Coordinator |
| Vote without registration | Yes | Coordinator |
| One human, one vote | **No** | Allowlist/registrar patterns exist ([ELIGIBILITY.md](ELIGIBILITY.md)); binding key to person remains organizational |
| Secret ballot | **No** | Transparent DHT model; **NO-GO** for alternate DNA in this repo ([SCOPE.md](SCOPE.md)) |
| Government-grade certification | **No** | Out of scope per [SCOPE.md](SCOPE.md) |

## Review cadence

When changing DNA or coordinator rules, update this file if **assumptions or mitigations** change. Target: review with releases and [CHANGELOG.md](CHANGELOG.md); roadmap P0–P5 for this repo is **complete** for the transparent ballot path ([ROADMAP.md](ROADMAP.md)).
