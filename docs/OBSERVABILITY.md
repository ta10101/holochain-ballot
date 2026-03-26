# Observability

This document satisfies **P4.3** by defining a lightweight observability pattern for pilot clients and demos.

## Goals

- Make failures understandable without digging through stack traces.
- Keep event logs machine-parseable.
- Reuse a small set of error codes across client and dashboard paths.

## Error envelope (v1)

Client-side errors should normalize into:

```json
{
  "stage": "create_election",
  "code": "PHASE_BLOCKED",
  "message": "original error text"
}
```

Fields:

- `stage`: operation phase where error occurred
- `code`: normalized category
- `message`: raw message text for debugging

## Normalized codes currently used

- `ALREADY_REGISTERED`
- `ALREADY_VOTED`
- `NOT_REGISTERED`
- `NOT_ALLOWLISTED`
- `REGISTRATION_LIMIT`
- `PHASE_BLOCKED`
- `CHOICE_OUT_OF_RANGE`
- `UNKNOWN`

These are intentionally coarse and derived from current guest error text.

## Script logging format

`scripts/minimal-client.mjs` emits structured JSON lines to stdout/stderr, for example:

```json
{"ts":"...","event":"zome_call_start","stage":"cast_vote","fn_name":"cast_vote"}
{"ts":"...","event":"zome_call_ok","stage":"cast_vote","fn_name":"cast_vote"}
{"ts":"...","event":"client_done"}
```

On failure:

```json
{"ts":"...","event":"client_failed","stage":"main","code":"NOT_REGISTERED","message":"..."}
```

## Dashboard observability hooks

`scripts/dashboard-demo.mjs` now:

- Emits normalized `code` on `expected_error` SSE events.
- Emits normalized fatal payloads on `fatal` SSE events.
- Writes structured fatal logs to server stdout (`dashboard_fatal` event).

This keeps browser timeline events and backend logs aligned.

## Pilot guidance

- Persist JSON logs from client scripts and dashboard server in pilot runs.
- Correlate with conductor logs when triaging network/validation incidents.
- Treat normalized codes as UX hints, not protocol guarantees.

## Future improvements

- Add explicit numeric/string error enums from coordinator responses.
- Add optional request correlation ids across admin/app/zome calls.
- Add metrics counters around zome call latencies and failure rates.
