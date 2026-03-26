# Versioning

This doc defines how versions are tracked for app code, zomes, and packaged artifacts.

## Sources of version truth

- JS package version: `package.json` (`version`)
- Rust zome crate versions:
  - `dnas/voting/zomes/integrity/voting_integrity/Cargo.toml`
  - `dnas/voting/zomes/coordinator/voting/Cargo.toml`
- Release notes: `CHANGELOG.md`

## Current strategy (P3)

Use semantic versioning at the project level:

- Patch: docs/tests/ops fixes or non-breaking behavior clarifications.
- Minor: backward-compatible feature additions (new optional fields, docs, tests).
- Major: breaking protocol/schema/API behavior requiring coordinated client changes.

For each release candidate:

1. Update `CHANGELOG.md` under a new version heading.
2. Bump `package.json` version.
3. If behavior/API changes materially, bump both Rust crate versions in zome `Cargo.toml`.
4. Build and pack artifacts (`npm run docker:build:happ`).
5. Tag the repo (e.g. `v0.2.0`) after tests pass.

## hApp and DNA artifact strategy

- `workdir/holochain-ballot.happ` and `dnas/voting/workdir/voting.dna` are build artifacts.
- They are regenerated from current source and manifests; they do not carry an independent human version field in this repo.
- Release version is represented by:
  - git tag (`vX.Y.Z`)
  - matching `CHANGELOG.md` entry
  - package/crate versions at that commit

## Compatibility expectations

- Backward-compatible coordinator input changes should be additive and use serde defaults where possible.
- Any breaking zome input/entry semantics must be explicitly called out in `CHANGELOG.md` with migration notes.

## Release checklist

1. `npm run docker:build:happ`
2. `npm run docker:test`
3. Update `CHANGELOG.md`
4. Bump versions (`package.json`, relevant `Cargo.toml`)
5. Commit and tag (`vX.Y.Z`)
