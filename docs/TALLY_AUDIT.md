# Tally audit (P2)

**P2.2** in [ROADMAP.md](ROADMAP.md). Assumes you understand the vote path ([VOTE_PATH.md](VOTE_PATH.md)).

## What `get_tally` returns

The coordinator zome returns:

- **`title`**, **`options`** — from the **latest** `Election` state for the given create hash (same as user-visible ballot labels).
- **`counts`** — `counts[i]` = number of **accepted** votes with `choice_index == i`, counted from **Ballot** links off the election’s **create** entry hash.
- **`vote_action_hashes`** — the **`ActionHash` of each vote record** counted, sorted by raw hash bytes (deterministic order, not timestamp order).

Each hash identifies the **`create_entry` action** for a `Vote` on the voter’s source chain (the commit the voter published).

## How to re-verify a tally (manual audit)

Given `election_create_action` `C` and a tally object `T`:

1. **Resolve election** — Load the latest `Election` for `C` (same walk the coordinator uses: creator update chain from `C`). Note `options.len()` as `m`.
2. **Initialize** — `counts = [0, …, 0]` length `m`; `seen_hashes = []`.
3. **Enumerate ballot links** — `LinkQuery` with base = **entry hash of the create action** for `C` (not latest update entry hash), link type **Ballot**.
4. For each link target entry hash, **`get`** the vote record:
   - Deserialize `Vote`; confirm `vote.election_action == C` (must reference the **create** hash).
   - Confirm `vote.choice_index < m` (integrity should have enforced this at publish time).
   - Confirm the record author is **registered** for this election (optional stricter audit: walk `VoterRegistration` links and match author).
   - Increment `counts[vote.choice_index]`.
   - Append `vote_record.action_address()` to `seen_hashes`.
5. **Sort** `seen_hashes` the same way as the coordinator: by `action_hash.get_raw_32()` (lexicographic byte order).
6. **Compare** `counts` and `seen_hashes` to `T.counts` and `T.vote_action_hashes`.

If any peer returns a different tally for the same `C` after sufficient gossip, investigate partition, withheld data, or client bugs—not “blockchain consensus” in the classic sense.

## Limitations auditors should know

- **Excluded votes:** Entries that failed validation or were never integrated on your node won’t appear in your link scan.
- **Deduplication:** The coordinator assumes one vote per agent; the link set could be examined for duplicate authors if you want an extra check.
- **Registration cap / allowlist:** Affect *who may vote*, not the ballot math once votes exist.

## Optional export format

A portable JSON shape for tools is defined in [schemas/tally-export.schema.json](schemas/tally-export.schema.json). Example:

```json
{
  "holochain_ballot_tally_export": "1.0",
  "election_create_action": "uhCEk…",
  "fetched_at": "2026-03-26T12:00:00Z",
  "title": "Snack preference",
  "options": ["Pizza", "Tacos", "Sushi"],
  "counts": [1, 0, 1],
  "vote_action_hashes": ["uhCEk…", "uhCEk…"]
}
```

Field names match the zome output where possible; `holochain_ballot_tally_export` is a **version string** for the wrapper (not the DNA version). Hash encoding in JSON is **implementation-defined** (Tryorama often surfaces base64); auditors should normalize to raw bytes when comparing.
