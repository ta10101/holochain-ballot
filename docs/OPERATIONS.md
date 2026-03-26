# Operations

This document covers day-to-day operator commands for local dev, CI parity, and demos.

## Prerequisites

- Docker Desktop (recommended on Windows), with `docker compose`.
- Or local Nix with `nix develop` using the repo `flake.nix`.

## Quick paths

- Build + package hApp: `npm run docker:build:happ`
- Run full Tryorama suite: `npm run docker:test`
- Live browser dashboard: `npm run demo:dashboard`
- Fresh dashboard start (kills stale port mappings): `npm run demo:dashboard:fresh`

## Docker path (recommended)

From repo root:

1. Build zomes in a Nix container:
   - `docker compose -f docker/docker-compose.yml run --rm build-wasm`
2. Pack DNA + hApp bundles:
   - `docker compose -f docker/docker-compose.yml run --rm pack-happ`
3. Run tests:
   - `docker compose -f docker/docker-compose.yml run --rm tryorama`

Equivalent npm wrappers:

- `npm run docker:build:happ` (steps 1+2)
- `npm run docker:test` (step 3, requires `.happ` already built)

Output artifacts:

- `dnas/voting/workdir/voting.dna`
- `workdir/holochain-ballot.happ`

## Local Nix path

If you already have Nix tooling locally:

1. Enter shell: `nix develop`
2. Install JS deps (once per lock update): `npm ci`
3. Build + pack: `npm run build:happ`
4. Test: `npm run test:only`

Notes:

- Local path uses host tools (`cargo`, `hc`) from Holonix in the dev shell.
- Docker path is better for reproducibility across machines.

## Dashboard operations

Start dashboard:

- `npm run demo:dashboard`
- Open [http://localhost:3456/](http://localhost:3456/)

Common issue: port 3456 already in use (often stale `demo-dashboard-run-*` containers).

Fix options:

- `docker compose -f docker/docker-compose.yml down --remove-orphans`
- or `npm run demo:dashboard:fresh` (automates cleanup + start)

Runtime knobs:

- `DEMO_AUTO_STEP_MS` (dashboard auto pacing; default `0`)
- `DEMO_LEGACY_FLOW=1` (skip phased lifecycle in shared scenario)
- `DEMO_PLAYER_COUNT=2|4` (visible terminal demo)

## CI overview

Workflow: `.github/workflows/ci.yml`

Job `docker-tryorama` runs:

1. `build-wasm`
2. `pack-happ`
3. `tryorama`

This mirrors local Docker commands so CI failures can be reproduced with the same compose services.

## Troubleshooting checklist

- Missing `.happ` error:
  - Run `npm run docker:build:happ` first.
- Dashboard opens but no events:
  - Check terminal logs for `demo-dashboard` container.
  - Ensure port `3456` not mapped by another process/container.
- Flaky multi-conductor tests:
  - Re-run `npm run docker:test` after cleaning old containers (`down --remove-orphans`).
  - Keep `vitest.config.js` file-level parallelism disabled for Tryorama runs.
