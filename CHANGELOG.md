# Changelog

All notable changes to this project are documented in this file.

The format is inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this repo uses semantic versioning at the project level.

## [Unreleased]

### Added

- Sister-project bridge to **private** [holochain-ballot-e2e](https://github.com/ta10101/holochain-ballot-e2e): [docs/holochain-ballot-e2e-plan.md](docs/holochain-ballot-e2e-plan.md), [docs/holochain-ballot-e2e-roadmap.md](docs/holochain-ballot-e2e-roadmap.md); README and [ROADMAP.md](docs/ROADMAP.md) cross-links.
- P3 operator docs:
  - `docs/OPERATIONS.md`
  - `docs/VERSIONING.md`
  - `docs/BACKUP_RECOVERY.md`
- P2 docs for vote-path integrity and tally audits:
  - `docs/VOTE_PATH.md`
  - `docs/TALLY_AUDIT.md`
  - `docs/LIMITS.md`
  - `docs/schemas/tally-export.schema.json`
- P4 client integration assets:
  - `docs/CLIENT_INTEGRATION.md`
  - `scripts/minimal-client.mjs`
  - `docs/OBSERVABILITY.md`
- P5.1 research note:
  - `docs/SECRET_BALLOT_RESEARCH.md`
- P5.2 explicit secret-ballot **NO-GO** decision recorded in `docs/SCOPE.md`
- `docs/LAUNCH_KIT.md` with copy-ready awareness posts, pitch text, and rollout checklist

### Changed

- Roadmap: **P5.3** marked **N/A** under [SCOPE.md](docs/SCOPE.md) **NO-GO**; “Current focus” points to maintenance/pilots instead of an open P5 phase.
- Docs: [THREAT_MODEL.md](docs/THREAT_MODEL.md) and cross-links updated so P1–P4 completion and P5 **NO-GO** are not described as unfinished roadmap work.
- Voting DNA supports optional per-election `max_registrations` cap with coordinator and integrity checks.
- Added Tryorama coverage for registration-cap behavior in `tests/voting-p2.test.js`.
- Demo and README now align with phased election lifecycle flow (`advance_election_phase`).
- Minimal client and dashboard now emit normalized error categories and structured logs for pilot troubleshooting.
