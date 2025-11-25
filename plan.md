# Clayproto SDK Refactoring Plan

## Goals

1. Single, clear export surface - no `clayprotoSDK` vs `ClayProto` vs `clay` confusion
2. Eliminate unnecessary wrappers - export functions directly
3. Schema-bound collections - no repeated `schemaName` parameter
4. Lispy/functional feel - data-first, composable

## Current Problems

- Three different export names for related functionality
- `ClayProto` class wraps `clayprotoSDK` which wraps ATProto - two layers of indirection
- Every CRUD method takes `schemaName` as first arg (repetitive)
- Field builders exported twice (`string()` from both `clay` object and directly)
- `_type` and `_config` feel like implementation leaking out

## New API Design

### Single Entry Point

```ts
import {schema, string, number, boolean, ref, array} from '$lib/clayproto'
```

### Schema Definition Returns a Collection

```ts
const Task = schema('Task', {
	title: string({required: true}),
	done: boolean({default: false}),
	assignee: ref('User')
})

// Task is now a collection with bound methods
await Task.create({title: 'Buy milk'})
await Task.get(rkey)
await Task.query({where: {done: false}})
await Task.update(rkey, {done: true})
await Task.delete(rkey)
```

### Type Inference

```ts
type TaskData = InferSchema<typeof Task>
// {title: string, done?: boolean, assignee?: string}
```

## File Structure

### `$lib/clay.ts` (single public module)

Exports:

- `schema(name, fields)` → returns `Collection`
- `string(config?)`, `number(config?)`, `boolean(config?)`, `ref(schema, config?)`, `array(items, config?)`
- `validate(fields, data)` → `ValidationResult`
- `loadSchemas()` → `Collection[]` (hydrate from ATProto)
- Types: `Collection`, `Field`, `ValidationResult`, `ValidationError`, `InferSchema<T>`

### `$lib/clay/atproto.ts` (internal, not exported)

Low-level ATProto operations, no wrapper object:

- `createRecord(collection, rkey, data)`
- `getRecord(collection, rkey, did?)`
- `listRecords(collection, did?)`
- `updateRecord(collection, rkey, data)`
- `deleteRecord(collection, rkey)`
- `getDid()`, `isAuthenticated()`

### `$lib/clay/validate.ts` (internal)

- `validate(fields, data)`
- `ValidationError` class

## Migration Steps

### Step 1: Create `$lib/clay/atproto.ts`

Extract low-level functions from `clayproto-sdk.ts`:

- Remove the `clayprotoSDK` object wrapper
- Export functions directly
- Keep schema/item collection constants here

### Step 2: Create `$lib/clay/validate.ts`

Move validation logic:

- `validate()` function
- `ValidationError` class
- Type checks

### Step 3: Create `$lib/clay/collection.ts`

New `Collection` class/factory:

- Holds schema name, field definitions, rkey (once synced)
- Methods: `create`, `get`, `query`, `update`, `delete`
- Internal caching

### Step 4: Create `$lib/clay.ts`

Public API:

- `schema()` function that returns a Collection
- Re-export field builders
- Re-export types
- `loadSchemas()` to hydrate existing schemas

### Step 5: Update consumers

- `src/routes/` pages
- `src/lib/components/dynamic-form.svelte`

### Step 6: Delete old files

- Remove `clayproto-sdk.ts`
- Remove `clayproto.ts`

## Open Questions

1. Should `Collection` be a class or plain object with closures?
2. How to handle schema sync state (local-only vs synced to ATProto)?
3. Should `ref()` take a string name or a Collection reference?
4. Naming: `schema()` vs `collection()` vs `define()`?

## Non-Goals

- Breaking the ATProto record format (keep `app.clayproto.schema` and `app.clayproto.item`)
- Adding new features (focus on API clarity)
