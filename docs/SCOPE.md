# Scope — holochain-ballot

This document states **what this repository is for**, **who it is for**, and **what we explicitly do not claim**. It pairs with [THREAT_MODEL.md](THREAT_MODEL.md) and the working plan in [ROADMAP.md](ROADMAP.md).

**Status:** **Experimental** software for education, demos, and controlled org/community pilots; **not** a certified public-election system.

## Purpose

**holochain-ballot** is a **small, inspectable voting hApp** on Holochain: create elections, register voters (as agents), cast at most one vote per agent per election, and tally from **public** ballot links on the DHT. It ships with:

- **Rust zomes** (integrity + coordinator) under `dnas/voting/`
- **Tryorama tests** under `tests/`
- **Docker + Nix** tooling for reproducible builds and CI
- A **browser dashboard** that streams a live Tryorama run (developer education / demos)
- A **static Vite showcase** that explains mechanics (no live conductor required)

## Intended use

Reasonable targets:

- **Learning** how elections, registrations, and votes map to entries, links, and validation on Holochain
- **Prototyping** governance for **communities, DAOs, co-ops, teams**, or pilots where participants **accept** the trust model (see threat model)
- **Technical demos** and **internal dogfooding**, not public policy decisions by default

## Non-goals (we do not claim)

| Topic | Position |
|--------|-----------|
| **Government / binding public elections** | **Out of scope.** Not designed for certified municipal, state, or national elections. No legal certification path is implied. |
| **Secret ballot** | **Not implemented.** Votes are tied to published data suitable for **transparent** tallies. A formal **go/no-go** for any secret-ballot implementation is recorded below (**P5.2**). Background: [SECRET_BALLOT_RESEARCH.md](SECRET_BALLOT_RESEARCH.md). |
| **Strong identity / one-person-one-vote in the wild** | **Not solved here.** A “voter” is a **Holochain agent**. v1 eligibility is documented in [ELIGIBILITY.md](ELIGIBILITY.md) (optional allowlist); binding keys to real people remains an organizational problem. |
| **Sybil-resistant open voting** | **Not promised** without an explicit eligibility design. Anyone who can join the network and satisfy current zome rules may participate unless you add controls upstream. |
| **Replacement for certified voting systems** | **No.** This is experimental / educational software unless you run your own compliance process. |

## Relationship to the showcase and dashboard

- **Showcase (`showcase/`)** uses **fictional** scenarios and **fake hashes** to teach mechanics. It is **not** a deployed election.
- **Dashboard (`demo-dashboard/`)** runs **real Tryorama + your built `.happ`**. It is still a **developer demo**, not a productized voting service.

## Secret ballot / high-stakes track — go/no-go (P5.2)

This section records an **explicit product decision** before any secret-ballot DNA work. It satisfies roadmap **P5.2**.

**Decision: NO-GO** — Do **not** implement a secret-ballot or “high-stakes certified election” voting path **inside this repository’s current DNA** unless and until the criteria below are met and this section is **revised** to **GO**.

**Rationale (summary):**

- This repo’s shipped model is **transparent tally** (public ballot links and auditable counts). That is intentional for demos and org pilots.
- Strong ballot secrecy and end-to-end verifiability require **different cryptography, validation, and operations** than a transparent tally (see [SECRET_BALLOT_RESEARCH.md](SECRET_BALLOT_RESEARCH.md)).
- Shipping secrecy as a partial or silent change would **misrepresent** what the codebase guarantees.

**Conditions to revisit (potential future GO):**

A future **GO** would require **all** of the following, documented in a proposal and reflected here:

1. **Context:** target use case and legal/compliance constraints (explicitly **not** binding government elections unless separately chartered).
2. **Adversary model:** coercion, collusion, endpoint compromise, and operator trust assumptions.
3. **Protocol choice:** named approach (e.g. E2E verifiable / credential-based / other) with security rationale and citations.
4. **Implementation plan:** **new DNA version or fork** (not a silent patch to the transparent tally path), per roadmap **P5.3**.
5. **Review plan:** independent security review budget and operational readiness.

Until then, **no secret-ballot features** are in scope for the current `holochain-ballot` DNA in this repo.

**Roadmap link:** [ROADMAP.md](ROADMAP.md) P5 — **P5.3** is **N/A** while this section remains **NO-GO**; it describes the work **only if** this section is later revised to **GO**.

## Versioning expectations

Treat releases as **best-effort** unless tagged; verify behavior with **`npm run docker:test`** (or local Tryorama) after upgrades. Versioning notes: [VERSIONING.md](VERSIONING.md).

## Where to go next

- Risks and assumptions: [THREAT_MODEL.md](THREAT_MODEL.md)
- Ordered work: [ROADMAP.md](ROADMAP.md)
