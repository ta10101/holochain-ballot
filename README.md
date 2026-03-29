# holochain-ballot

Lightweight voting hApp: elections, voter registration, ballots, and tallies on Holochain, plus a static **showcase** UI in `showcase/`.

**Status:** **Experimental** software for learning, demos, and controlled org/community pilots; **not** for certified public/government elections.

**Scope:** Built for **learning, demos, and community/org-style pilots** where participants accept a transparent DHT tally and agent-key identity—not for binding government elections or certified public voting. Read **[docs/SCOPE.md](docs/SCOPE.md)** (intent and non-goals) and **[docs/THREAT_MODEL.md](docs/THREAT_MODEL.md)** (risks and limits).

**Roadmap:** [docs/ROADMAP.md](docs/ROADMAP.md) — phases **P0–P5** complete; secret-ballot **P5.3** is **N/A** under [SCOPE.md](docs/SCOPE.md) **NO-GO** (not unfinished work).

**Eligibility & lifecycle (P1):** [docs/ELIGIBILITY.md](docs/ELIGIBILITY.md) (allowlist), [docs/ELECTION_LIFECYCLE.md](docs/ELECTION_LIFECYCLE.md) (phases & `advance_election_phase`), [docs/CAPABILITIES.md](docs/CAPABILITIES.md) (who may call what).

**Transparent ballot / audit (P2):** [docs/VOTE_PATH.md](docs/VOTE_PATH.md) (invariants), [docs/TALLY_AUDIT.md](docs/TALLY_AUDIT.md) (`vote_action_hashes`, recount steps), [docs/LIMITS.md](docs/LIMITS.md) (global + per-election `max_registrations`), [docs/schemas/tally-export.schema.json](docs/schemas/tally-export.schema.json) (optional JSON export).

**Operations & releases (P3):** [docs/OPERATIONS.md](docs/OPERATIONS.md) (runbook), [docs/VERSIONING.md](docs/VERSIONING.md) (artifact/version strategy), [docs/BACKUP_RECOVERY.md](docs/BACKUP_RECOVERY.md) (pilot backup notes), [CHANGELOG.md](CHANGELOG.md).

**Real client path (P4):** [docs/CLIENT_INTEGRATION.md](docs/CLIENT_INTEGRATION.md) (admin/app websocket flow, auth token, zome call payloads), `scripts/minimal-client.mjs` (create -> register -> vote -> tally), [docs/OBSERVABILITY.md](docs/OBSERVABILITY.md) (consistent error surfacing + logging hooks).

**Secret ballot / P5:** [docs/SECRET_BALLOT_RESEARCH.md](docs/SECRET_BALLOT_RESEARCH.md) (P5.1 research). **Go/no-go (P5.2):** [docs/SCOPE.md](docs/SCOPE.md#secret-ballot--high-stakes-track--go-no-go-p52) — current decision **NO-GO** for secret-ballot DNA in this repo until criteria there are met.

**Sister project (E2E, private GitHub):** **[holochain-ballot-e2e](https://github.com/ta10101/holochain-ballot-e2e)** — secret ballot + end-to-end verifiable design ([roadmap](https://github.com/ta10101/holochain-ballot-e2e/blob/master/docs/ROADMAP.md), access required). Bridge: [docs/holochain-ballot-e2e-plan.md](docs/holochain-ballot-e2e-plan.md).

**Share / awareness:** [docs/LAUNCH_KIT.md](docs/LAUNCH_KIT.md) (copy-paste posts, 30-second pitch, first-week checklist).

## Prerequisites

- **Docker** (recommended on Windows), or local **Nix** + `nix develop` with Holonix.

## Build the `.happ` (Docker)

```bash
npm run docker:build:happ
```

Produces `workdir/holochain-ballot.happ` and `dnas/voting/workdir/voting.dna`.

## Tests (Tryorama)

After the `.happ` exists:

```bash
npm run docker:test
```

Vitest files under `tests/`: two-player smoke, **four-player** tally, **guard** cases, **P1** lifecycle/allowlist (`voting-p1.test.js`), **P2** registration cap (`voting-p2.test.js`).

**CI:** GitHub Actions (`.github/workflows/ci.yml`) runs the same Docker build + Tryorama on push/PR to `main` or `master`.

## See the real hApp in the terminal (play-by-play)

Same multi-conductor setup as the tests, but each step is printed (with optional pauses):

```bash
npm run demo:visible
```

Optional: slow the narration — PowerShell: `$env:DEMO_STEP_MS='2000'; npm run demo:visible` — bash: `DEMO_STEP_MS=2000 npm run demo:visible`.

Four conductors: `DEMO_PLAYER_COUNT=4 npm run demo:visible` (Linux/macOS) or set the env in PowerShell before running.

Phased lifecycle is **on** by default (draft → register → open voting). To run the older single-phase flow: `DEMO_LEGACY_FLOW=1 npm run demo:visible` (bash) or `$env:DEMO_LEGACY_FLOW='1'; npm run demo:visible` (PowerShell). Same variable applies when the dashboard spawns the shared scenario (restart the dashboard container after changing env in `docker-compose.yml` if needed).

## Browser dashboard (live Tryorama + SSE)

```bash
npm run demo:dashboard
```

Then open **http://localhost:3456/** (leave the terminal running; **Ctrl+C** stops the server). Requires `workdir/holochain-ballot.happ` (run `docker:build:happ` first if needed).

**If the port is busy** (e.g. an old `demo-dashboard-run-*` container still mapped to 3456), either:

```bash
docker compose -f docker/docker-compose.yml down --remove-orphans
```

or start cleanly in one step:

```bash
npm run demo:dashboard:fresh
```

### Dashboard behavior

- **Event stream URL** uses a **path**, not only query params, so manual mode is reliable:  
  `/events/auto/4`, `/events/manual/4`, `/events/auto/2`, `/events/manual/2`  
  (fallback: `/events?step=manual&players=4`).
- **Lifecycle:** the shared scenario (`scripts/lib/voting-scenario.mjs`) creates a **draft** election and calls **`advance_election_phase`** before registration and before voting (see [docs/ELECTION_LIFECYCLE.md](docs/ELECTION_LIFECYCLE.md)). Set **`DEMO_LEGACY_FLOW=1`** to skip that and use the legacy `active` flow.
- **Auto** pacing uses **real conductor/DHT time only** (no artificial delay between steps), unless you set **`DEMO_AUTO_STEP_MS`** (e.g. in `docker/docker-compose.yml` for the `demo-dashboard` service).
- **Manual** mode: use **Next step** in the UI; the server accepts **`POST /advance`** or **`GET /advance`**.

With Nix/Holochain on the host (no Docker): `npm ci && npm run demo:dashboard:local`.

## Minimal real client (local conductor)

Run a basic app install + zome flow against a real conductor:

```bash
npm run client:minimal
```

Script: `scripts/minimal-client.mjs` (supports env overrides like `HC_ADMIN_URL`, `HC_APP_PORT`, `HC_HAPP_PATH`).

## Showcase (Vite + React)

Educational UI + interactive lab (Alex, Blake, Casey, Dana — same names as the default **four-player** live demo):

```bash
npm run showcase:install
npm run showcase:dev
```

The showcase mentions the **live DNA dashboard** on port **3456** when you run `demo:dashboard` alongside.

## Local Nix shell

```bash
nix develop
npm run build:happ
npm run test:only
```

## Rules enforced (summary)

- **Integrity:** election title/options bounds (length and count caps), non-empty options, optional **allowlist** size cap, vote `choice_index` in range for the referenced election.
- **Coordinator:** **register** before **vote**; **one registration per agent per election**; **one vote per agent**; duplicate checks use `VoterRegistration` / `Ballot` links from the election entry. **Phases** (`draft`, `open_registration`, `open_voting`, `closed`, legacy `active`) gate registration and voting; only the **creator** may call **`advance_election_phase`** (see [docs/ELECTION_LIFECYCLE.md](docs/ELECTION_LIFECYCLE.md)). Optional **`max_registrations`** caps distinct registrants ([docs/LIMITS.md](docs/LIMITS.md)).

Holochain is not HTTP: there are **no classic request rate limits** on the DHT. Production deployments should use **capabilities**, client UX, and operational monitoring as appropriate. See **[docs/SCOPE.md](docs/SCOPE.md)** and **[docs/THREAT_MODEL.md](docs/THREAT_MODEL.md)** before relying on this in a pilot.

## Repo layout

- `dnas/voting/` — integrity + coordinator zomes
- `workdir/happ.yaml` — app manifest
- `tests/voting-smoke.test.js` — two-player smoke
- `tests/voting-four-players.test.js` — four players, tally `[2,1,1]`
- `tests/voting-guards.test.js` — registration / vote ordering
- `tests/voting-p1.test.js` — allowlist + phased lifecycle
- `tests/voting-p2.test.js` — registration cap (`max_registrations`)
- `scripts/dashboard-demo.mjs` — SSE dashboard server
- `scripts/lib/voting-scenario.mjs` — shared Tryorama scenario (demos + dashboard; phased lifecycle by default)
- `scripts/minimal-client.mjs` — P4 minimal real-conductor client flow
- `docs/SCOPE.md`, `docs/THREAT_MODEL.md`, `docs/ROADMAP.md` — scope, risks, delivery plan
- `docs/ELIGIBILITY.md`, `docs/ELECTION_LIFECYCLE.md`, `docs/CAPABILITIES.md` — P1 eligibility, phases, roles
- `docs/VOTE_PATH.md`, `docs/TALLY_AUDIT.md`, `docs/LIMITS.md`, `docs/schemas/tally-export.schema.json` — P2 vote path, audit, caps
- `docs/OPERATIONS.md`, `docs/VERSIONING.md`, `docs/BACKUP_RECOVERY.md`, `CHANGELOG.md` — P3 operations, versioning, recovery, release notes
- `docs/CLIENT_INTEGRATION.md` — P4 conductor app install + token + zome-call flow
- `docs/OBSERVABILITY.md` — P4 client/demo error envelope and logging
- `docs/SECRET_BALLOT_RESEARCH.md` — P5.1 research note (no implementation); **P5.2** **NO-GO** in `docs/SCOPE.md`
