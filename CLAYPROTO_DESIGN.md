# ClayProto High-Level SDK Design

## Overview

ClayProto's high-level SDK provides an elegant, Rails-like API for building ATProto applications. It wraps the low-level SDK (`src/lib/atproto/sdk.ts`) with schema builders, validation, relations, and filtering capabilities.

## Design Principles

### 1. Elegance Over Features

The API prioritizes developer experience and readability:

```typescript
// Clean schema definition
const schemas = await cp.defineSchemas({
	folder: {
		name: clay.string({ required: true }),
		parent: clay.ref('folder', { nullable: true }),
		color: clay.string({ default: 'blue' })
	}
})

// Simple CRUD
await cp.create('folder', { name: 'Photos', parent: null })
const folders = await cp.query('folder', { where: { parent: null } })
```

### 2. Build on Existing SDK

The high-level SDK **wraps** rather than replaces the low-level SDK:

```
┌─────────────────────────────────┐
│   ClayProto High-Level API      │
│   (schema builders, validation) │
├─────────────────────────────────┤
│   Low-Level SDK (sdk.ts)        │
│   (CRUD operations)             │
├─────────────────────────────────┤
│   @atproto/api                  │
│   (Agent, OAuth)                │
└─────────────────────────────────┘
```

No low-level functionality is duplicated. All PDS communication goes through the existing `ClayprotoSDK` class.

### 3. Type Safety Without Sacrifice

TypeScript types are inferred where possible, but we don't sacrifice DX for perfect type safety:

```typescript
// Type inference works for simple cases
type Folder = InferSchemaType<typeof folderSchema>

// But we don't force users to deal with complex generics
const folder = await cp.get('folder', rkey) // Returns typed object
```

### 4. Progressive Enhancement

Start simple, add features as needed:

1. **MVP**: Schema builder + validation + basic CRUD
2. **Phase 2**: Relations resolution
3. **Phase 3**: Client-side filtering/ordering
4. **Future**: Real-time subscriptions, optimistic updates

## Architecture

### Schema Builder

The schema builder uses a fluent API to define field types:

```typescript
export const clay = {
  string(config?: FieldConfig): FieldBuilder<string>
  number(config?: FieldConfig): FieldBuilder<number>
  boolean(config?: FieldConfig): FieldBuilder<boolean>
  ref<T>(schema: string, config?: RefConfig): FieldBuilder<T>
  array<T>(items: FieldBuilder<T>, config?: ArrayConfig): FieldBuilder<T[]>
}
```

Each builder returns a `FieldBuilder<T>` containing:

- `_type`: Runtime type identifier
- `_config`: Configuration (required, default, nullable, etc.)
- `_infer`: Phantom type for TypeScript inference

### Schema Registry

An internal registry tracks defined schemas:

```typescript
class SchemaRegistry {
	private schemas: Map<string, { builder: SchemaBuilder; rkey?: string }>

	register(name, builder, rkey?)
	get(name)
	has(name)
	all()
}
```

This enables:

- Schema lookup during validation
- Reference resolution
- Schema persistence across page loads

### Validation Engine

Client-side validation before writes:

```typescript
function validate(schemaBuilder, data): ValidationResult {
	// 1. Check required fields
	// 2. Validate types
	// 3. Recursively validate arrays
	// 4. Return errors with field paths
}
```

Benefits:

- Fast feedback (no round-trip to PDS)
- Clear error messages
- Prevents invalid data from reaching PDS

### Relations Resolution

References are stored as `rkey` strings but can be resolved on query:

```typescript
const files = await cp.query('file', {
	where: { folder: folderId },
	include: { folder: true } // Resolves folder reference
})

// Returns:
// [{ name: 'beach.jpg', folder: { name: 'Vacation', ... } }]
```

Implementation:

1. Detect `ref()` fields in schema
2. Fetch referenced items by rkey
3. Replace rkey with full object
4. Cache fetched items

### Filtering & Ordering

Client-side filtering since no AppView yet:

```typescript
await cp.query('file', {
	where: { folder: id }, // Simple equality
	where: (file) => file.tags.includes('vacation'), // Function filter
	orderBy: { size: 'desc' },
	limit: 10
})
```

Process:

1. Fetch all items from PDS (`listRecords`)
2. Filter by schema type
3. Apply where clause
4. Sort by orderBy
5. Apply limit

**Trade-off**: This doesn't scale to large datasets, but works for MVP. Future versions can use AppView for server-side queries.

### Caching Strategy

Simple in-memory cache to reduce PDS round-trips:

```typescript
private itemCache: Map<string, Map<string, unknown>>
//                      schema     rkey      data
```

Cache invalidation:

- Updated on create/update/delete
- Cleared on page reload
- Could be enhanced with IndexedDB for persistence

## Data Flow

### Creating an Item

```
User Code                ClayProto              Registry           Low-Level SDK          PDS
    |                        |                      |                    |                  |
    | create('folder', data) |                      |                    |                  |
    |----------------------->|                      |                    |                  |
    |                        | get schema           |                    |                  |
    |                        |--------------------->|                    |                  |
    |                        |                      |                    |                  |
    |                        | apply defaults       |                    |                  |
    |                        |----->                |                    |                  |
    |                        |                      |                    |                  |
    |                        | validate()           |                    |                  |
    |                        |----->                |                    |                  |
    |                        |                      |                    |                  |
    |                        | createItem()         |                    |                  |
    |                        |------------------------------------->     |                  |
    |                        |                      |                    | putRecord        |
    |                        |                      |                    |----------------->|
    |                        |                      |                    |                  |
    |                        | update cache         |                    |                  |
    |                        |----->                |                    |                  |
    |                        |                      |                    |                  |
    | return { rkey, data }  |                      |                    |                  |
    |<-----------------------|                      |                    |                  |
```

### Querying with Relations

```
User Code                ClayProto              Cache              Low-Level SDK          PDS
    |                        |                      |                    |                  |
    | query('file', opts)    |                      |                    |                  |
    |----------------------->|                      |                    |                  |
    |                        | listItems()          |                    |                  |
    |                        |------------------------------------->     |                  |
    |                        |                      |                    | listRecords      |
    |                        |                      |                    |----------------->|
    |                        |                      |                    |                  |
    |                        | filter by schema     |                    |                  |
    |                        |----->                |                    |                  |
    |                        |                      |                    |                  |
    |                        | apply where clause   |                    |                  |
    |                        |----->                |                    |                  |
    |                        |                      |                    |                  |
    |                        | sort & limit         |                    |                  |
    |                        |----->                |                    |                  |
    |                        |                      |                    |                  |
    |                        | resolve refs         |                    |                  |
    |                        |--------------------->| check cache        |                  |
    |                        |                      |----->              |                  |
    |                        |                      | cache miss         |                  |
    |                        | getItem()            |                    |                  |
    |                        |------------------------------------->     |                  |
    |                        |                      |                    | getRecord        |
    |                        |                      |                    |----------------->|
    |                        |                      |                    |                  |
    | return resolved items  |                      |                    |                  |
    |<-----------------------|                      |                    |                  |
```

## Key Implementation Details

### Schema Conversion

FieldBuilders are converted to SchemaFields for the low-level SDK:

```typescript
function fieldBuilderToSchemaField(name, builder): SchemaField {
	return {
		name,
		type: builder._type === 'ref' ? 'string' : builder._type,
		required: builder._config.required,
		items: builder._type === 'array' ? builder._config.items._type : undefined
	}
}
```

### NSID Generation

User schemas use a simple convention:

```typescript
const schemaDefinition = {
	nsid: `clay.user.${name}`, // e.g., clay.user.folder
	title: capitalize(name),
	fields: convertedFields
}
```

**Trade-off**: All user schemas share `clay.user.*` namespace. This could cause collisions but keeps it simple for MVP. Future versions could use DID-based namespacing.

### Reference Storage

References are stored as plain rkey strings:

```json
{
	"$type": "app.clayproto.item",
	"schemaType": "clay.user.file",
	"data": {
		"name": "beach.jpg",
		"folder": "3jui7kd63fc2a", // Just the rkey
		"url": "https://..."
	}
}
```

**Why not full AT URIs?** Simpler and more compact. We know all references are within the same user's repo for now.

### Type Inference

Uses TypeScript's conditional types for inference:

```typescript
type InferSchemaType<S extends SchemaBuilder> = {
	[K in keyof S]: S[K]['_infer']
}

// Usage:
const folderSchema = {
	name: clay.string({ required: true }),
	parent: clay.ref('folder', { nullable: true })
}

type Folder = InferSchemaType<typeof folderSchema>
// { name: string | null, parent: unknown | null }
```

**Limitation**: Generic ref types aren't fully inferred. This is acceptable for MVP.

## Comparison to Ideal API Sketch

The sketch (`clayproto-api-sketch.ts`) was aspirational. Here's what we implemented vs. what's future work:

### Implemented (MVP)

- ✅ Schema builder (`clay.string()`, `clay.ref()`, etc.)
- ✅ Schema definition and storage
- ✅ Validation
- ✅ CRUD operations (create, get, query, update, delete)
- ✅ Relations resolution
- ✅ Client-side filtering and ordering
- ✅ Type inference

### Not Yet Implemented

- ❌ **Svelte reactivity**: The sketch shows `$folders` but we return plain promises
- ❌ **Real-time subscriptions**: No firehose integration yet
- ❌ **Optimistic updates**: Creates wait for PDS round-trip
- ❌ **Batch operations**: No `clay.batch([...])`
- ❌ **Schema discovery**: No `clay.discover.schemas()`
- ❌ **Multi-user queries**: Only single-user for now
- ❌ **Schema migrations**: No versioning system
- ❌ **Offline support**: No IndexedDB persistence

### Rationale

**Focus on data API only** as requested. Reactivity, real-time, and offline features require:

1. AppView infrastructure (not built yet)
2. Firehose integration (complex)
3. Svelte-specific wrappers (outside data layer)

The current implementation provides a solid foundation that can be enhanced with these features later.

## Usage Examples

### Basic CRUD

```typescript
// Initialize
const cp = new ClayProto(session)

// Define schemas (one-time)
await cp.defineSchemas({
	folder: {
		name: clay.string({ required: true }),
		color: clay.string({ default: 'blue' })
	}
})

// Create
const { rkey } = await cp.create('folder', {
	name: 'Photos',
	color: 'purple'
})

// Read
const folder = await cp.get('folder', rkey)

// Query
const folders = await cp.query('folder', {
	where: { color: 'purple' },
	orderBy: { name: 'asc' }
})

// Update
await cp.update('folder', rkey, { name: 'My Photos' })

// Delete
await cp.delete('folder', rkey)
```

### Relations

```typescript
await cp.defineSchemas({
	folder: {
		name: clay.string({ required: true })
	},
	file: {
		name: clay.string({ required: true }),
		folder: clay.ref('folder', { required: true })
	}
})

// Create with reference
const { rkey: folderId } = await cp.create('folder', { name: 'Docs' })
await cp.create('file', {
	name: 'report.pdf',
	folder: folderId
})

// Query with relation resolved
const files = await cp.query('file', {
	where: { folder: folderId },
	include: { folder: true }
})

// Result:
// [{ name: 'report.pdf', folder: { name: 'Docs', ... } }]
```

### Advanced Filtering

```typescript
// Function-based filter
const important = await cp.query('file', {
	where: (file) => {
		return file.tags.includes('important') && file.size > 1000000
	}
})

// Combined with ordering and limit
const top10 = await cp.query('file', {
	where: (file) => file.tags.includes('work'),
	orderBy: { size: 'desc' },
	limit: 10
})
```

### Schema Loading

```typescript
// On subsequent app loads, load existing schemas
const cp = new ClayProto(session)
await cp.loadSchemas()

// Now you can use them without re-defining
const folders = await cp.query('folder', {})
```

## Error Handling

```typescript
try {
	await cp.create('folder', {
		name: '' // Invalid: required field is empty
	})
} catch (error) {
	if (error instanceof ValidationError) {
		console.log('Validation errors:', error.errors)
		// [{ field: 'name', message: 'Required field' }]
	}
}
```

## Testing Checklist

- [ ] Create schemas and verify they appear in PDS
- [ ] Create items and verify they're stored correctly
- [ ] Query items and verify filtering works
- [ ] Update items and verify changes persist
- [ ] Delete items and verify they're removed
- [ ] Test reference resolution
- [ ] Test validation (required, types, arrays)
- [ ] Test defaults application
- [ ] Test schema loading from PDS
- [ ] Test cache behavior

## Open Questions & Future Work

### 1. Scale & Performance

**Issue**: Client-side filtering doesn't scale beyond ~1000 items.

**Solutions**:

- Build AppView with proper indexing
- Add pagination to `query()`
- Implement cursor-based loading

### 2. Real-time Updates

**Issue**: Data is static until next query.

**Solutions**:

- Subscribe to firehose for relevant collections
- Emit events on data changes
- Integrate with Svelte's reactivity system

### 3. Optimistic Updates

**Issue**: UI feels slow waiting for PDS writes.

**Solutions**:

- Return immediately from mutations
- Update cache optimistically
- Sync to PDS in background
- Handle conflicts

### 4. Multi-user Scenarios

**Issue**: Can only query own data.

**Solutions**:

- Add `did` parameter to `query()`
- Aggregate queries across multiple DIDs
- Requires AppView for performance

### 5. Schema Evolution

**Issue**: No versioning or migration system.

**Solutions**:

- Add version field to schemas
- Store migration functions
- Run migrations on read
- Document breaking changes

### 6. Batch Operations

**Issue**: Creating many items requires many round-trips.

**Solutions**:

- Add `createMany()` method
- Batch validation before writes
- Use `applyWrites()` for atomic commits

### 7. Type Safety Improvements

**Issue**: Generic ref types don't fully infer.

**Solutions**:

- More complex TypeScript generics
- Code generation from schemas
- Runtime type guards

## Performance Considerations

### Current Implementation

- **Schema lookup**: O(1) via Map
- **Validation**: O(n) where n = number of fields
- **Query**: O(m) where m = total items (fetches all from PDS)
- **Relations**: O(r) where r = number of refs to resolve

### Optimizations

1. **Cache aggressively**: Keep items in memory
2. **Lazy loading**: Don't resolve refs until needed
3. **Batch requests**: Fetch multiple refs in parallel
4. **IndexedDB**: Persist cache across page loads

## Conclusion

This high-level SDK provides an elegant foundation for building ATProto apps with minimal friction. It wraps the low-level SDK without duplicating functionality, validates data client-side, and resolves relations automatically.

The design prioritizes developer experience over feature completeness, making it perfect for "single-prompt apps" where an LLM can generate working code quickly.

Future enhancements (real-time, optimistic updates, multi-user) can be added incrementally without breaking the core API.
