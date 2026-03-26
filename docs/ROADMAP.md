# holochain-ballot — roadmap

This is the **working plan** for the repo. Work is ordered **P0 → P5**. Check items off as you complete them (edit this file or track in issues that reference these IDs).

## Goals we locked in

| Topic | Decision |
|--------|----------|
| **North star** | Trustworthy **community / org / DAO** voting—not certified municipal general elections. |
| **Approach** | **Incremental** changes on the current Holochain hApp; avoid big-bang rewrites. |
| **Default ballot model** | **Transparent tallies** (DHT + links). Secret ballot was **addressed in P5** (research + **NO-GO** in [SCOPE.md](SCOPE.md)); not implemented in this DNA. |
| **Identity** | **Agent key ≠ person**. Eligibility is an **explicit layer** (registrar, allowlist, credentials—TBD in P1). |

## Out of scope (unless the project charter changes)

- Binding **city / state / national** general elections and legal certification paths.
- Promising **Sybil-resistant global open voting** without a defined identity layer.
- Replacing **certified** government voting systems.

---

## P0 — Honesty, safety messaging, baseline hygiene

**Exit criteria:** A new reader knows what this is for, what it is *not* for, and the main risks.

- [x] **P0.1** — Add `docs/SCOPE.md`: product scope, **non-goals**, intended users (orgs/DAOs/pilots), link to this roadmap.
- [x] **P0.2** — Add `docs/THREAT_MODEL.md`: short sections on Sybil, device/key compromise, DHT visibility, coordinator/trust assumptions, “what Holochain does / does not solve.”
- [x] **P0.3** — Align **README** intro with P0 (one paragraph + links to `docs/SCOPE.md`, `docs/THREAT_MODEL.md`).
- [x] **P0.4** — Audit **showcase** and **demo dashboard** copy so nothing implies “election-grade” or government use.

---

## P1 — Eligibility & roles (design first, then code)

**Exit criteria:** Documented model for *who* may vote and *who* may administer an election; first code path matches the doc.

- [x] **P1.1** — `docs/ELIGIBILITY.md`: choose and document **one** v1 pattern (recommendation: **invite-only / allowlist** or **designated registrar** signing claims—pick one and justify).
- [x] **P1.2** — `docs/ELECTION_LIFECYCLE.md`: states (e.g. draft → open registration → open voting → closed), valid transitions, who can trigger each.
- [x] **P1.3** — **Capabilities / roles**: specify which zome functions require which role (even if v1 is “election creator = admin”).
- [x] **P1.4** — Implement **minimal lifecycle + roles** in DNA (schema + coordinator rules + tests) as per P1.2–P1.3.

---

## P2 — Integrity of the vote path (transparent ballot)

**Exit criteria:** Third parties can understand how to audit a tally; edge cases are tested or explicitly deferred.

- [x] **P2.1** — Document **register → vote → tally** invariants; list edge cases (double register, vote without register—already enforced; add any new ones from P1).
- [x] **P2.2** — **Tally audit trail**: document `vote_action_hashes` and steps to re-verify; optional export format (e.g. JSON schema) in `docs/`.
- [x] **P2.3** — Review **caps** (title/options length, option count); document; add **per-election optional caps** if needed for spam (design + tests).

---

## P3 — Operator experience

**Exit criteria:** Someone else can run tests, build `.happ`, and run demos without tribal knowledge.

- [x] **P3.1** — `docs/OPERATIONS.md`: Docker/Nix paths, `docker:test`, `demo:dashboard`, `demo:dashboard:fresh`, port **3456** / orphan containers, CI overview.
- [x] **P3.2** — **Versioning**: maintain `CHANGELOG.md`; tag releases; note `.happ` / DNA version strategy (manifest or zome metadata).
- [x] **P3.3** — **Backup / recovery** notes: what lives on conductors vs DHT; what to back up for a pilot.

---

## P4 — Real client path (beyond Tryorama + static showcase)

**Exit criteria:** A supported path to call the hApp from a **real conductor** (minimal UI or scripted client).

- [x] **P4.1** — `docs/CLIENT_INTEGRATION.md`: app install, app token, zome call flow (holochain-client-js or equivalent).
- [x] **P4.2** — **Minimal client**: small example (script or tiny UI) that runs create → register → vote → tally against a local conductor.
- [x] **P4.3** — **Observability**: consistent error surfacing; optional logging hooks for pilots.

---

## P5 — Secret ballot / high-stakes (separate track)

**Exit criteria:** Go/no-go decision recorded; no production claims until independent review. While [SCOPE.md](SCOPE.md) remains **NO-GO**, **P5.3** is **N/A** (not forgotten—intentionally not pursued).

- [x] **P5.1** — **Research note** only: E2E verifiable / secret ballot directions, citations, fit with Holochain constraints.
- [x] **P5.2** — **Explicit go/no-go** in `docs/SCOPE.md` before any implementation.
- [x] **P5.3** — **N/A under current NO-GO** ([SCOPE.md](SCOPE.md)). *If* scope is ever revised to **GO**, then: new DNA version or fork; threat model + external review plan—**not** a silent patch to transparent tally.

---

## How we use this file

1. Work **top to bottom** within a phase before starting the next (unless a dependency forces a small exception—note it in a PR).
2. When starting an item, add the **PR / issue** link next to the checkbox in a follow-up edit.
3. **Monthly** (or each release): skim P0–P1 for copy and scope drift.

---

## Current focus

**Roadmap P0–P5 (transparent ballot + P5 research/decision) is complete.** Secret-ballot implementation is **not** in progress ([SCOPE.md](SCOPE.md) **NO-GO**; **P5.3** N/A until a future **GO**). Next work is **maintenance**, **pilots** ([CLIENT_INTEGRATION.md](CLIENT_INTEGRATION.md), [OPERATIONS.md](OPERATIONS.md)), or **new goals** outside this file.
