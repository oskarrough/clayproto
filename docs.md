# Clayproto ATProto Integration

## Modules

- `src/lib/atproto-oauth.ts` - OAuth singleton, `buildClientId()` helper
- `src/lib/clayproto.ts` - `clay` object for CRUD, types (`Schema`, `Item`, `SchemaField`)

## Authentication

```ts
import {atprotoOAuth, buildClientId} from '$lib/atproto-oauth'

await atprotoOAuth.init(buildClientId())
await atprotoOAuth.handleCallback()

const did = atprotoOAuth.getStoredDid()
if (did) await atprotoOAuth.restoreSession(did)

await atprotoOAuth.signIn('user.bsky.social')
await atprotoOAuth.signOut()
```

## CRUD

```ts
import {clay, SCHEMA, ITEM, tid} from '$lib/clayproto'

// SCHEMA = 'ar.0sk.clayproto.schema'
// ITEM = 'ar.0sk.clayproto.item'

await clay.listRecords(SCHEMA)
await clay.listRecords(ITEM, otherDid) // public agent
await clay.getRecord(SCHEMA, rkey)
await clay.putRecord(SCHEMA, tid(), record)
await clay.deleteRecord(SCHEMA, rkey)
```
