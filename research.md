# ATProto Research Notes for clayproto

## Core Architecture

ATProto separates three critical layers: **identity, data storage, and application logic**. This enables portable accounts and user-controlled data while allowing developers to build interoperable apps on a shared ecosystem.

### Key Components

- **DID (Distributed Identity)**: Cryptographic identity that remains consistent regardless of which PDS hosts the data
- **PDS (Personal Data Store)**: User repositories that can be centrally hosted or self-hosted
- **AppView**: Aggregates user repo data into a queryable database
- **Collections**: Typed sets within repositories organizing records by schema

## OAuth Authentication Flow

Uses `@atproto/oauth-client-node` library. The flow:

1. User provides their handle (domain name)
2. Trigger authorization with scope:

```typescript
const url = await oauthClient.authorize(handle, {
	scope: 'atproto transition:generic'
})
return res.redirect(url.toString())
```

3. Callback handler stores credentials and attaches user's DID to session via cookie
4. Handle resolves to DID via `_atproto` TXT DNS records, which resolves to PDS location

## Record & Collection CRUD

### Reading Records

Use Agent's repo methods with three parameters:

```typescript
await agent.com.atproto.repo.getRecord({
	repo: agent.assertDid, // User identifier (DID)
	collection: 'app.bsky.actor.profile',
	rkey: 'self' // Record key
})
```

### Writing Records

Use `putRecord` with a time-based key:

```typescript
await agent.com.atproto.repo.putRecord({
	repo: agent.assertDid,
	collection: 'xyz.statusphere.status',
	rkey: TID.nextStr(), // Time-based identifier
	record: {
		status: '👍',
		createdAt: new Date().toISOString()
	}
})
```

### Listing Records

Query collections via API:

```
GET /xrpc/com.atproto.repo.listRecords?repo=did:plc:core&collection=app.clayproto.item
```

## Lexicon Structure

Lexicon is ATProto's schema system defined in JSON format, optimized for constraints and code generation.

### Schema Components

All schemas require three core properties:

```json
{
	"lexicon": 1,
	"id": "com.example.recordType",
	"defs": {
		"main": {
			/* definition */
		}
	}
}
```

### Record Type Definition

```json
{
	"lexicon": 1,
	"id": "app.clayproto.item",
	"defs": {
		"main": {
			"type": "record",
			"key": "tid",
			"record": {
				"type": "object",
				"required": ["schemaType", "data", "createdAt"],
				"properties": {
					"schemaType": {
						"type": "string",
						"description": "NSID of the schema this item follows"
					},
					"data": {
						"type": "unknown",
						"description": "Dynamic data matching the schema"
					},
					"createdAt": {
						"type": "string",
						"format": "datetime"
					}
				}
			}
		}
	}
}
```

### Code Generation

Generate TypeScript types from Lexicons:

```bash
lex gen-server ./src/lexicon ./lexicons/*
```

## NSID Namespacing

**NSIDs (Namespace Identifiers)** use reverse-DNS format to establish ownership and uniqueness:

- **Format**: `domain.app.recordType`
- **Examples**:
  - `app.clayproto.schema` - Schema definitions
  - `app.clayproto.item` - User data items
  - `com.atproto.repo.getRecord` - API endpoints

### Namespace Management

- Organized hierarchically using DNS-style naming
- Clear ownership via domain control
- Minimal collision risk across multi-team development
- Enables discoverability

## The $type Field

Every record includes a `$type` field identifying its schema:

```json
{
	"$type": "app.clayproto.item",
	"schemaType": "clay.music.track",
	"data": {
		"url": "https://...",
		"title": "Song Name",
		"tags": ["rock", "alternative"]
	},
	"createdAt": "2025-11-24T10:30:00Z"
}
```

The `$type` field:

- Identifies which Lexicon schema the record follows
- Used in validation before publishing
- Establishes record's AT URI: `at://did:plc:user/app.clayproto.item/12345`

## AppView ↔ PDS Communication

### Information Flow

1. **Users write records** to personal repos (at:// URLs) via their PDS
2. **Write events emit** to the firehose (relay services)
3. **AppView subscribes** to firehose, validates, and ingests matching records
4. **Applications query** the aggregated AppView database

### Firehose Integration

Monitor network events for specific collections:

```typescript
new Firehose({
	filterCollections: ['app.clayproto.item', 'app.clayproto.schema'],
	handleEvent: async (evt) => {
		if ((evt.event === 'create' || evt.event === 'update') && isValidRecord(evt.record)) {
			// Persist to AppView database
		}
	}
})
```

### Optimistic Updates

Improve UX by immediately writing to local database after successful repo writes, avoiding wait times for firehose propagation.

## Querying Records by Type

### Direct Record Access

```typescript
await agent.com.atproto.repo.getRecord({
	repo: userDid,
	collection: 'app.clayproto.item',
	rkey: recordKey
})
```

### List Records in Collection

```typescript
await agent.com.atproto.repo.listRecords({
	repo: userDid,
	collection: 'app.clayproto.item'
})
```

### AppView Custom Queries

Build custom query endpoints in your AppView to filter by:

- Schema type
- Tags/metadata
- Date ranges
- User DIDs

## Dynamic Schemas

### Approach for clayproto

Since Lexicons must be published and versioned, true runtime dynamic schemas aren't directly supported. **Recommended approach:**

1. **Fixed wrapper schema** (`app.clayproto.item`) with:
   - `schemaType` field (string) - references user's custom schema
   - `data` field (type: `unknown`) - holds dynamic content
   - Standard metadata (createdAt, etc.)

2. **Schema definitions** stored as records in `app.clayproto.schema`:
   - User creates schema definitions via UI
   - Stored as JSON in their repo
   - Referenced by `schemaType` field in items

3. **Client-side validation**:
   - Fetch schema definition from `app.clayproto.schema`
   - Validate `data` field against schema before creating item
   - Server-side validation in AppView ingestion

### Example Schema Definition Record

```json
{
	"$type": "app.clayproto.schema",
	"nsid": "clay.music.track",
	"title": "Music Track",
	"fields": [
		{"name": "url", "type": "string", "required": true},
		{"name": "title", "type": "string", "required": true},
		{"name": "tags", "type": "array", "items": "string"}
	],
	"createdAt": "2025-11-24T10:00:00Z"
}
```

## Schema Evolution & Validation

**Constraint Immutability**: Published Lexicon schemas cannot modify existing constraints:

- Loosening constraints breaks old software validation
- Tightening constraints breaks new software
- Only add optional constraints to previously unconstrained fields

**Breaking Changes**: Require new NSIDs (new schema versions)

## Tokens for Extensibility

Use tokens instead of hard-coded enums for extensibility:

```json
{
	"type": "string",
	"knownValues": ["clay.type.book", "clay.type.game", "clay.type.recipe"]
}
```

Allows adding new types without breaking existing validation.

## Serverless Implementation Notes

### Cloudflare Workers Stack

- **Workers**: Global code deployment within 50ms of users
- **KV**: Distributed caching for handle-to-DID mappings
- **D1**: Distributed relational database for AppView data
- **Durable Objects**: Real-time coordination

### Firehose on Serverless

Traditional persistent WebSocket connections don't work on serverless platforms. Solutions:

- **Cron Triggers** with cursors stored in Durable Objects
- **Batch-poll Jetstream** events instead of persistent connections
- Store last cursor position to resume on next trigger

## Answers to Open Questions

### Where do custom Lexicons live?

Lexicons are JSON files that must be:

1. Published and accessible via NSID
2. Hosted at a discoverable location
3. Registered for code generation

For clayproto's dynamic schemas, use a **hybrid approach**: fixed Lexicons for wrapper types (`app.clayproto.schema`, `app.clayproto.item`) with schema definitions stored as records.

### How do we namespace user schemas?

**Option 1**: Use a prefix convention within the data

- User schemas: `clay.username.typename`
- Stored as string in `schemaType` field
- Not actual Lexicons, just identifiers

**Option 2**: Use user's DID in namespace

- `clay.{did}.typename`
- More collision-resistant
- Longer identifiers

**Recommendation**: Use short usernames with collision detection. If collision occurs, append incrementing number.

### Discovery mechanism?

1. **User's own schemas**: Query their `app.clayproto.schema` collection
2. **Public schemas**:
   - AppView maintains searchable index
   - Query endpoint: list popular schemas by usage count
   - Categories/tags for browsing
3. **Sharing**: Users can reference others' schema NSIDs

### Can we use dynamic schemas without central Lexicon registration?

**Yes, with the hybrid approach**:

- Core Lexicons (`app.clayproto.schema`, `app.clayproto.item`) are fixed and registered
- User schema definitions live as records (JSON data)
- Client-side validation handles the dynamic aspect
- No need to register each user's custom schema as a Lexicon

## Implementation Strategy

1. **Define core Lexicons**: `app.clayproto.schema` and `app.clayproto.item`
2. **OAuth flow**: Connect user to their PDS
3. **SDK wrapper class**: Clean API for ATProto interactions
4. **Schema builder UI**: Create/edit schema definitions → write to `app.clayproto.schema`
5. **Dynamic form generator**: Read schema → generate input form
6. **Item CRUD**: Validate against schema → write to `app.clayproto.item`
7. **AppView ingestion**: Subscribe to firehose → validate → persist
8. **Query interface**: Build searchable views of items

## Key Takeaways

- **Records** are typed data stored in collections
- **Collections** are namespaced by NSIDs (reverse-DNS)
- **$type field** identifies the schema
- **Lexicons** define structure but can wrap dynamic data
- **AppViews** aggregate data from multiple user repos
- **Firehose** streams all network events
- **OAuth** connects users to their PDS
- **AT URIs** (`at://did/collection/rkey`) provide portable references
