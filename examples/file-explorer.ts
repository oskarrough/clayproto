/**
 * Example: File & Folder Explorer using ClayProto
 *
 * This demonstrates the "single-prompt app" concept where an LLM can generate
 * a complete working application using ClayProto's elegant API.
 */

import { ClayProto, clay } from '../src/lib/clayproto'
import type { OAuthSession } from '@atproto/oauth-client-node'

// ============================================================================
// SETUP
// ============================================================================

// Assume we have an OAuth session (from your auth flow)
declare const session: OAuthSession

const cp = new ClayProto(session)

// ============================================================================
// 1. DEFINE SCHEMAS
// ============================================================================

const schemas = await cp.defineSchemas({
	folder: {
		name: clay.string({ required: true }),
		parent: clay.ref('folder', { nullable: true }),
		color: clay.string({ default: 'blue' }),
		createdAt: clay.string({ required: true })
	},

	file: {
		name: clay.string({ required: true }),
		folder: clay.ref('folder', { required: true }),
		url: clay.string({ required: true }),
		size: clay.number({ nullable: true }),
		tags: clay.array(clay.string()),
		createdAt: clay.string({ required: true })
	}
})

console.log('Schemas created:', schemas)

// ============================================================================
// 2. CREATE DATA
// ============================================================================

// Create root folders
const { rkey: photosId } = await cp.create('folder', {
	name: 'Photos',
	parent: null,
	color: 'purple',
	createdAt: new Date().toISOString()
})

const { rkey: documentsId } = await cp.create('folder', {
	name: 'Documents',
	parent: null,
	color: 'blue',
	createdAt: new Date().toISOString()
})

// Create subfolder
const { rkey: vacationId } = await cp.create('folder', {
	name: 'Vacation 2024',
	parent: photosId,
	color: 'orange',
	createdAt: new Date().toISOString()
})

// Create files
await cp.create('file', {
	name: 'beach.jpg',
	folder: vacationId,
	url: 'https://example.com/beach.jpg',
	size: 2048000,
	tags: ['vacation', 'beach', 'summer'],
	createdAt: new Date().toISOString()
})

await cp.create('file', {
	name: 'sunset.jpg',
	folder: vacationId,
	url: 'https://example.com/sunset.jpg',
	size: 1850000,
	tags: ['vacation', 'sunset'],
	createdAt: new Date().toISOString()
})

await cp.create('file', {
	name: 'report.pdf',
	folder: documentsId,
	url: 'https://example.com/report.pdf',
	size: 524288,
	tags: ['work', 'important'],
	createdAt: new Date().toISOString()
})

// ============================================================================
// 3. QUERY DATA
// ============================================================================

// Get all root folders
const rootFolders = await cp.query('folder', {
	where: { parent: null },
	orderBy: { name: 'asc' }
})

console.log('Root folders:', rootFolders)
// [
//   { _rkey: '...', name: 'Documents', parent: null, color: 'blue', ... },
//   { _rkey: '...', name: 'Photos', parent: null, color: 'purple', ... }
// ]

// Get files in vacation folder with folder relation resolved
const vacationFiles = await cp.query('file', {
	where: { folder: vacationId },
	include: { folder: true }
})

console.log('Vacation files:', vacationFiles)
// [
//   {
//     _rkey: '...',
//     name: 'beach.jpg',
//     folder: { _rkey: '...', name: 'Vacation 2024', parent: '...', ... },
//     url: 'https://...',
//     size: 2048000,
//     tags: ['vacation', 'beach', 'summer']
//   },
//   ...
// ]

// Search files by tag using function filter
const beachFiles = await cp.query('file', {
	where: (file) => file.tags.includes('beach')
})

console.log('Beach files:', beachFiles)

// ============================================================================
// 4. UPDATE DATA
// ============================================================================

// Rename a folder
await cp.update('folder', photosId, {
	name: 'My Photos'
})

// Add tag to file
const file = await cp.get('file', vacationFiles[0]._rkey)
if (file) {
	await cp.update('file', file._rkey, {
		tags: [...file.tags, 'favorite']
	})
}

// ============================================================================
// 5. DELETE DATA
// ============================================================================

// Delete a file
await cp.delete('file', vacationFiles[0]._rkey)

// Delete a folder (note: you'd want to handle cascade deletion in production)
await cp.delete('folder', vacationId)

// ============================================================================
// 6. VALIDATION EXAMPLES
// ============================================================================

// Manual validation before creating
const invalidData = {
	name: '', // Empty name - should fail
	folder: 'not-a-valid-rkey',
	url: 'https://example.com/file.jpg'
}

const result = clay.validate(
	{
		name: clay.string({ required: true }),
		folder: clay.ref('folder', { required: true }),
		url: clay.string({ required: true })
	},
	invalidData
)

if (!result.valid) {
	console.log('Validation errors:', result.errors)
	// [{ field: 'name', message: 'Required field' }]
}

// Validation happens automatically on create/update
try {
	await cp.create('file', {
		// Missing required fields
		name: 'test.jpg',
		// folder: required!
		url: 'https://example.com/test.jpg',
		tags: [],
		createdAt: new Date().toISOString()
	})
} catch (error) {
	if (error instanceof Error && error.name === 'ValidationError') {
		console.log('Create failed:', error.message)
	}
}

// ============================================================================
// 7. ADVANCED QUERIES
// ============================================================================

// Get all files, sorted by size descending
const largeFiles = await cp.query('file', {
	orderBy: { size: 'desc' },
	limit: 10
})

console.log('Largest files:', largeFiles)

// Complex filter function
await cp.query('file', {
	where: (file) => {
		return file.tags.includes('work') && file.tags.includes('important') && file.size > 100000
	}
})

// Get a folder with its parent resolved
const folderWithParent = await cp.get('folder', vacationId, {
	include: { parent: true }
})

console.log('Folder with parent:', folderWithParent)
// {
//   _rkey: '...',
//   name: 'Vacation 2024',
//   parent: { _rkey: '...', name: 'My Photos', ... },
//   color: 'orange'
// }

// ============================================================================
// 8. LOADING EXISTING SCHEMAS
// ============================================================================

// On subsequent app loads, load schemas from PDS instead of defining them again
const cp2 = new ClayProto(session)
await cp2.loadSchemas()

// Now you can use the schemas
const allFolders = await cp2.query('folder', {})
console.log('All folders:', allFolders)

// ============================================================================
// USAGE IN SVELTE COMPONENT
// ============================================================================

/*
<script lang="ts">
import { ClayProto, clay } from '$lib/clayproto'
import { getContext } from 'svelte'

// Get session from context (set up in layout)
const session = getContext('session')
const cp = new ClayProto(session)

// Load schemas on mount
$effect(() => {
	cp.loadSchemas()
})

// Reactive state
let folders = $state<Awaited<ReturnType<typeof cp.query<typeof folderSchema>>>([])
let files = $state<Awaited<ReturnType<typeof cp.query<typeof fileSchema>>>([])
let selectedFolder = $state<string | null>(null)

// Load data
async function loadData() {
	folders = await cp.query('folder', {
		where: { parent: null },
		orderBy: { name: 'asc' }
	})
}

async function loadFiles(folderId: string) {
	files = await cp.query('file', {
		where: { folder: folderId },
		include: { folder: true }
	})
}

async function createFolder() {
	const name = prompt('Folder name:')
	if (!name) return

	await cp.create('folder', {
		name,
		parent: selectedFolder,
		createdAt: new Date().toISOString()
	})

	await loadData()
}

async function deleteFolder(rkey: string) {
	if (!confirm('Delete folder?')) return
	await cp.delete('folder', rkey)
	await loadData()
}

// Load initial data
loadData()
</script>

<div class="file-explorer">
	<div class="folders">
		<button onclick={createFolder}>+ New Folder</button>

		{#each folders as folder}
			<div
				class="folder"
				class:selected={selectedFolder === folder._rkey}
				onclick={() => {
					selectedFolder = folder._rkey
					loadFiles(folder._rkey)
				}}
			>
				<span style="color: {folder.color}">\u{1F4C1}</span>
				{folder.name}
				<button onclick|stopPropagation={() => deleteFolder(folder._rkey)}>×</button>
			</div>
		{/each}
	</div>

	<div class="files">
		{#if selectedFolder}
			{#each files as file}
				<div class="file">
					<div class="file-name">{file.name}</div>
					<div class="file-size">{(file.size / 1024).toFixed(1)} KB</div>
					<div class="file-tags">
						{#each file.tags as tag}
							<span class="tag">{tag}</span>
						{/each}
					</div>
				</div>
			{/each}
		{:else}
			<p>Select a folder</p>
		{/if}
	</div>
</div>

<style>
	.file-explorer {
		display: flex;
		gap: 2rem;
		height: 100vh;
	}

	.folders {
		width: 300px;
		border-right: 1px solid #ccc;
		padding: 1rem;
	}

	.folder {
		padding: 0.5rem;
		cursor: pointer;
		border-radius: 4px;
	}

	.folder:hover {
		background: #f0f0f0;
	}

	.folder.selected {
		background: #e0e0ff;
	}

	.files {
		flex: 1;
		padding: 1rem;
	}

	.file {
		padding: 1rem;
		border: 1px solid #ddd;
		border-radius: 4px;
		margin-bottom: 0.5rem;
	}

	.tag {
		background: #007bff;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.875rem;
		margin-right: 0.25rem;
	}
</style>
*/
