# Backup and recovery notes

This document covers practical pilot-grade backup and recovery expectations for `holochain-ballot`.

## What lives where

- **Source of truth for app logic**
  - Git repo (`dnas/`, scripts, docs, manifests).
- **Packaged artifacts**
  - `workdir/holochain-ballot.happ`
  - `dnas/voting/workdir/voting.dna`
- **Runtime state (per conductor/agent)**
  - Source chain data, authored/integrated DHT shards, peer metadata, and lair keystore material.

In a distributed network, no single node has to hold all data at all times, but each operator still needs local backups for continuity.

## Minimum backup set for pilots

For each operator environment:

1. Conductor data directory (all databases).
2. Lair keystore data and secrets.
3. App install/config material needed to reconnect app interfaces.
4. This repo at the deployed tag/commit (or immutable release bundle).

Without keystore material, an agent may lose identity continuity even if some DHT data remains available elsewhere.

## Backup cadence

- Before each pilot event/rehearsal.
- After material config changes.
- On a recurring schedule (daily/weekly based on activity).

Keep at least:

- One recent backup
- One known-good baseline backup

## Recovery goals

- Restore conductor + lair state for existing agents.
- Reinstall hApp from the same release/tag.
- Reconnect and allow gossip resync before operations resume.

## Recovery drill (recommended)

Run periodically in a staging environment:

1. Stop services cleanly.
2. Restore conductor + lair from backup.
3. Rebuild/repack artifacts from tagged commit.
4. Start conductor(s), reinstall app if needed.
5. Run smoke flow (create/register/vote/tally or existing election read/tally).
6. Confirm expected identity and access still work.

Document elapsed time and failures; improve runbook accordingly.

## Important caveats

- This project is not a certified election system; treat recovery as pilot operations, not legal-election continuity.
- Backup/restore paths are environment-specific (launcher/manual conductor/containerized setups differ).
- If keys are compromised, recovery is not enough; rotate identity and follow incident response in `docs/THREAT_MODEL.md`.
