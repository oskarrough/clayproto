/**
 * ClayProto SDK - Ideal API Design
 *
 * Goal: Make "build me a file folder explorer" possible in one prompt
 */

import { clay } from 'clayproto'

// ============================================================================
// 1. SCHEMA DEFINITION
// ============================================================================

// Developer defines schemas using a clean builder API
const schemas = clay.defineSchemas({
  folder: {
    name: clay.string({ required: true }),
    parent: clay.ref('folder', { nullable: true }),
    color: clay.string({ default: 'blue' }),
    createdAt: clay.datetime({ auto: true }),
  },

  file: {
    name: clay.string({ required: true }),
    folder: clay.ref('folder', { required: true }),
    url: clay.string({ required: true }),
    size: clay.number(),
    tags: clay.array(clay.string()),
    createdAt: clay.datetime({ auto: true }),
  }
})

// This generates:
// - Lexicon JSONs (app.clayproto.schema records)
// - TypeScript types
// - Validation functions
// - CRUD helpers

type Folder = typeof schemas.folder.$type
type File = typeof schemas.file.$type

// ============================================================================
// 2. INITIALIZATION (one-time setup)
// ============================================================================

// On server/initialization, register schemas to user's PDS
await clay.init({
  oauth: {
    clientId: 'clayproto.app',
    redirectUri: '/auth/callback'
  },
  schemas
})

// ============================================================================
// 3. QUERIES (Reactive, Svelte-friendly)
// ============================================================================

// In Svelte components - returns a rune
const folders = clay.query('folder', {
  where: { parent: null },
  orderBy: { createdAt: 'desc' }
})
// $folders is reactive, auto-updates from firehose

// With relations
const files = clay.query('file', {
  where: { folder: folderId },
  include: { folder: true } // populates folder object
})

// Single record
const folder = clay.get('folder', folderId)

// Search across all records of a type
const results = clay.search('file', {
  text: 'vacation',
  fields: ['name', 'tags']
})

// ============================================================================
// 4. MUTATIONS (Optimistic updates)
// ============================================================================

// Create
await clay.create('folder', {
  name: 'Photos',
  parent: null,
  color: 'purple'
})

// Update
await clay.update('folder', folderId, {
  name: 'Vacation Photos'
})

// Delete
await clay.delete('folder', folderId)

// Batch operations
await clay.batch([
  { type: 'create', schema: 'file', data: {...} },
  { type: 'update', schema: 'folder', id: '...', data: {...} },
])

// ============================================================================
// 5. RELATIONS & GRAPH QUERIES
// ============================================================================

// Get folder with all its files
const folderWithFiles = clay.get('folder', folderId, {
  include: {
    files: true // reverse relation
  }
})

// Nested queries
const rootFolders = clay.query('folder', {
  where: { parent: null },
  include: {
    files: {
      where: { tags: { contains: 'important' } }
    }
  }
})

// ============================================================================
// 6. REAL-TIME / SUBSCRIPTIONS
// ============================================================================

// Subscribe to changes (uses firehose under the hood)
const unsubscribe = clay.subscribe('folder', folderId, (folder) => {
  console.log('Folder updated:', folder)
})

// Subscribe to all records of a type
clay.subscribe('file', '*', (event) => {
  console.log(event.type, event.record) // 'create' | 'update' | 'delete'
})

// ============================================================================
// 7. OFFLINE / OPTIMISTIC UPDATES
// ============================================================================

// All mutations are automatically optimistic
// SDK updates local state immediately, syncs to PDS in background

await clay.create('file', { name: 'doc.pdf', ... })
// UI updates instantly, even if network is slow

// Manual sync control
clay.sync.status // 'syncing' | 'synced' | 'error'
await clay.sync.wait()

// ============================================================================
// 8. MULTI-USER / DISCOVERY
// ============================================================================

// Query other users' public schemas
const publicSchemas = await clay.discover.schemas({
  search: 'recipe',
  sortBy: 'popular'
})

// Use someone else's schema
await clay.install('did:plc:xyz', 'recipe')

// Query cross-user data (if AppView supports it)
const allRecipes = clay.query('recipe', {
  from: 'network', // vs 'me' (default)
  where: { tags: { contains: 'vegan' } }
})

// ============================================================================
// 9. VALIDATION & ERRORS
// ============================================================================

// Client-side validation before write
const result = clay.validate('folder', {
  name: '', // invalid
  parent: 'not-a-valid-ref'
})

if (!result.valid) {
  console.log(result.errors)
  // [{ field: 'name', message: 'Required' }, ...]
}

// Mutation errors
try {
  await clay.create('folder', { ... })
} catch (error) {
  if (error.type === 'VALIDATION') {
    // Schema validation failed
  } else if (error.type === 'AUTH') {
    // OAuth issues
  } else if (error.type === 'NETWORK') {
    // PDS unreachable
  }
}

// ============================================================================
// 10. SCHEMA EVOLUTION
// ============================================================================

// Mark schema version
const schemasV2 = clay.defineSchemas({
  folder: {
    ...schemas.folder,
    emoji: clay.string({ optional: true }), // added field
  }
}, { version: 2 })

await clay.migrate('folder', {
  from: 1,
  to: 2,
  transform: (old) => ({
    ...old,
    emoji: '📁' // default for existing records
  })
})

// ============================================================================
// USAGE IN SVELTE
// ============================================================================

/*
<script lang="ts">
import { clay } from 'clayproto'

// Reactive queries
const folders = clay.query('folder', { where: { parent: null } })

async function createFolder(name: string) {
  await clay.create('folder', { name, parent: null })
}

async function deleteFolder(id: string) {
  if (confirm('Delete?')) {
    await clay.delete('folder', id)
  }
}
</script>

<div>
  <button onclick={() => createFolder('New Folder')}>
    Add Folder
  </button>

  {#each $folders as folder}
    <div>
      {folder.name}
      <button onclick={() => deleteFolder(folder.id)}>×</button>
    </div>
  {/each}
</div>
*/

// ============================================================================
// KEY QUESTIONS TO ANSWER
// ============================================================================

/*
1. How does clay.query() handle AppView vs PDS reads?
   - Start with PDS listRecords (slower, always fresh)
   - Graduate to AppView once it's running (faster, eventual consistency)
   - Transparent to developer?

2. How does reactivity work?
   - Return Svelte runes internally?
   - Or return a store that wraps firehose updates?
   - Need to poll or maintain WebSocket?

3. Where do schemas live?
   - Stored in user's PDS as app.clayproto.schema records
   - But need to be fetched before querying
   - Cache in localStorage?

4. How to handle OAuth flow?
   - clay.auth.login(handle) redirects
   - clay.auth.getSession() checks if logged in
   - Middleware handles callback?

5. Relations/refs - stored how?
   - Just store the rkey?
   - Or full at:// URI?
   - How to resolve refs efficiently?

6. Optimistic updates without AppView?
   - Keep local cache (IndexedDB?)
   - Write to PDS, update cache immediately
   - Eventually consistent with firehose when AppView exists

7. Schema versioning - who runs migrations?
   - Client-side when reading old records?
   - Or AppView normalizes everything?
   - User responsibility?

8. Multi-user queries without AppView?
   - Not possible initially?
   - Start with single-user, add later?
*/
