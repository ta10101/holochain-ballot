# Client integration

This guide covers **P4.1**: calling `holochain-ballot` from a real conductor via `@holochain/client`.

Scope:

- Install the app from `workdir/holochain-ballot.happ`
- Issue app auth token
- Connect `AppWebsocket`
- Run zome calls for create/register/vote/tally (+ optional phase advance)

This is for local/dev pilots, not certified public election deployment.

## Prerequisites

- Built app bundle at `workdir/holochain-ballot.happ`
  - Docker path: `npm run docker:build:happ`
- A running conductor with Admin interface available
- Node.js project with:
  - `@holochain/client` (repo already pins `^0.20.x`, compatible with Holochain 0.6.x)

## Zome API surface (current)

Role name: `voting`  
Zome name: `voting`

Functions:

- `create_election(input) -> ActionHash`
- `advance_election_phase(input) -> ActionHash`
- `register_voter(election_action: ActionHash) -> ()`
- `cast_vote(input) -> ActionHash`
- `get_tally(election_action: ActionHash) -> TallyOutput`

Important identifier rule:

- Use the **create action hash** returned by `create_election` as election id for subsequent calls (`election_action` / `election_create_action`).

## Typical connection flow

1. Connect to admin websocket.
2. Generate/get agent pub key.
3. Install app (`holochain-ballot.happ`) for that agent.
4. Enable app.
5. Attach app interface.
6. Issue app auth token.
7. Connect app websocket with token.
8. Call zome functions by `role_name` + `zome_name`.

## End-to-end example (Node.js)

```js
import {
  AdminWebsocket,
  AppWebsocket,
} from "@holochain/client";

const ADMIN_URL = new URL("ws://127.0.0.1:65000");
const APP_PORT = 65001;
const APP_ID = "holochain-ballot-local";
const HAPP_PATH = "./workdir/holochain-ballot.happ";
const ORIGIN = "holochain-ballot-client";

async function main() {
  // 1) Admin connection
  const admin = await AdminWebsocket.connect({
    url: ADMIN_URL,
    wsClientOptions: { origin: ORIGIN },
  });

  // 2) Agent key
  const agent_key = await admin.generateAgentPubKey();

  // 3) Install app
  await admin.installApp({
    source: { type: "path", value: HAPP_PATH },
    installed_app_id: APP_ID,
    agent_key,
  });

  // 4) Enable app
  await admin.enableApp({ installed_app_id: APP_ID });

  // 5) Attach app interface
  await admin.attachAppInterface({
    port: APP_PORT,
    allowed_origins: ORIGIN,
  });

  // 6) Token
  const issued = await admin.issueAppAuthenticationToken({
    installed_app_id: APP_ID,
  });

  // 7) App websocket
  const app = await AppWebsocket.connect({
    url: new URL(`ws://127.0.0.1:${APP_PORT}`),
    token: issued.token,
    wsClientOptions: { origin: ORIGIN },
  });

  // 8) Zome call flow
  const electionAh = await app.callZome({
    role_name: "voting",
    zome_name: "voting",
    fn_name: "create_election",
    payload: {
      title: "Snack preference",
      options: ["Pizza", "Tacos", "Sushi"],
      // optional:
      // phase: "draft",
      // allowed_voters: [agentPubKey1, agentPubKey2],
      // max_registrations: 100,
    },
  });

  await app.callZome({
    role_name: "voting",
    zome_name: "voting",
    fn_name: "register_voter",
    payload: electionAh,
  });

  await app.callZome({
    role_name: "voting",
    zome_name: "voting",
    fn_name: "cast_vote",
    payload: {
      election_action: electionAh,
      choice_index: 0,
    },
  });

  const tally = await app.callZome({
    role_name: "voting",
    zome_name: "voting",
    fn_name: "get_tally",
    payload: electionAh,
  });

  console.log("tally", tally);

  await app.client.close();
  await admin.client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

## Optional phased lifecycle flow

If election starts as `phase: "draft"`:

1. Creator calls `advance_election_phase` to `open_registration`
2. Voters register
3. Creator calls `advance_election_phase` to `open_voting`
4. Voters cast votes
5. Optional creator close: `open_voting -> closed`

Payload:

```json
{
  "election_create_action": "<ActionHash from create_election>",
  "expected_phase": "open_registration",
  "next_phase": "open_voting"
}
```

## Payload reference

### `create_election`

```json
{
  "title": "string",
  "options": ["string", "string"],
  "phase": "active | draft | open_registration | open_voting | closed",
  "allowed_voters": ["AgentPubKey", "..."],
  "max_registrations": 100
}
```

Defaults:

- `phase` defaults to `active`
- `allowed_voters` defaults to `null` (open registration)
- `max_registrations` defaults to `null` (no cap)

### `cast_vote`

```json
{
  "election_action": "<create ActionHash>",
  "choice_index": 0
}
```

### `get_tally` output

```json
{
  "title": "Snack preference",
  "options": ["Pizza", "Tacos", "Sushi"],
  "counts": [1, 0, 1],
  "vote_action_hashes": ["<ActionHash>", "<ActionHash>"]
}
```

See `docs/TALLY_AUDIT.md` for recount and verification details.

## Common integration pitfalls

- Passing an **updated election action hash** instead of the original create hash.
- Trying to vote before registration or in the wrong phase.
- Not syncing peers in multi-conductor scenarios before expecting shared tally state.
- App websocket origin/token mismatch.

## Minimal in-repo client (P4.2)

This repo now includes:

- `scripts/minimal-client.mjs`
- npm command: `npm run client:minimal`

What it does:

1. Connect admin websocket
2. Install + enable `workdir/holochain-ballot.happ`
3. Attach app interface + issue auth token
4. Connect app websocket
5. Execute create -> register -> vote -> tally

Environment variables:

- `HC_ADMIN_URL` (default `ws://127.0.0.1:65000`)
- `HC_APP_PORT` (default `65001`)
- `HC_HAPP_PATH` (default `./workdir/holochain-ballot.happ`)
- `HC_ROLE_NAME` (default `voting`)
- `HC_ZOME_NAME` (default `voting`)

Observability:

- The script emits JSON-line logs (`event`, `stage`, timestamp) for each zome call.
- Errors are normalized to coarse codes (for example `NOT_REGISTERED`, `PHASE_BLOCKED`).
- See [OBSERVABILITY.md](OBSERVABILITY.md) for envelope details.
