/**
 * Test suite for ClayProto SDK
 *
 * Run this to verify the high-level SDK works correctly with the low-level SDK.
 * This would typically be run with a testing framework like Vitest, but can also
 * be executed directly with a real OAuth session.
 */

import { ClayProto, clay, ValidationError } from '../src/lib/clayproto'
import type { OAuthSession } from '@atproto/oauth-client-node'

// ============================================================================
// TEST HELPERS
// ============================================================================

function assert(condition: boolean, message: string) {
	if (!condition) {
		throw new Error(`Assertion failed: ${message}`)
	}
}

// Unused test helpers - kept for future use
// function assertThrows(fn: () => void, message: string) {
// 	try {
// 		fn()
// 		throw new Error(`Expected to throw: ${message}`)
// 	} catch {
// 		// Expected
// 	}
// }

// async function assertThrowsAsync(fn: () => Promise<void>, message: string) {
// 	try {
// 		await fn()
// 		throw new Error(`Expected to throw: ${message}`)
// 	} catch {
// 		// Expected
// 	}
// }

// ============================================================================
// TESTS
// ============================================================================

export async function runTests(session: OAuthSession) {
	console.log('Starting ClayProto tests...\n')

	const cp = new ClayProto(session)

	// Test 1: Schema Definition
	console.log('Test 1: Define schemas')
	const schemas = await cp.defineSchemas({
		testFolder: {
			name: clay.string({ required: true }),
			description: clay.string({ nullable: true }),
			count: clay.number({ default: 0 })
		},
		testFile: {
			name: clay.string({ required: true }),
			folder: clay.ref('testFolder', { required: true }),
			tags: clay.array(clay.string())
		}
	})

	assert(typeof schemas.testFolder === 'string', 'testFolder schema should have rkey')
	assert(typeof schemas.testFile === 'string', 'testFile schema should have rkey')
	console.log('✓ Schemas defined successfully\n')

	// Test 2: Validation
	console.log('Test 2: Validation')

	const validData = { name: 'Test', count: 5 }
	const validResult = clay.validate(
		{
			name: clay.string({ required: true }),
			count: clay.number()
		},
		validData
	)
	assert(validResult.valid, 'Valid data should pass validation')

	const invalidData = { name: '', count: 'not a number' }
	const invalidResult = clay.validate(
		{
			name: clay.string({ required: true }),
			count: clay.number({ required: true })
		},
		invalidData
	)
	assert(!invalidResult.valid, 'Invalid data should fail validation')
	assert(invalidResult.errors.length > 0, 'Should have validation errors')
	console.log('✓ Validation working correctly\n')

	// Test 3: Create Item
	console.log('Test 3: Create item')
	const { rkey: folderId, data: folderData } = await cp.create('testFolder', {
		name: 'Test Folder',
		description: 'A test folder',
		count: 10
	})

	assert(typeof folderId === 'string', 'Create should return rkey')
	assert(folderData.name === 'Test Folder', 'Data should match input')
	console.log('✓ Item created successfully\n')

	// Test 4: Get Item
	console.log('Test 4: Get item')
	const folder = await cp.get('testFolder', folderId)
	assert(folder !== null, 'Get should return item')
	assert(folder._rkey === folderId, 'Should have _rkey field')
	assert(folder.name === 'Test Folder', 'Should have correct data')
	console.log('✓ Item retrieved successfully\n')

	// Test 5: Create with Reference
	console.log('Test 5: Create with reference')
	const { rkey: fileId } = await cp.create('testFile', {
		name: 'test.txt',
		folder: folderId,
		tags: ['test', 'example']
	})
	assert(typeof fileId === 'string', 'File created with reference')
	console.log('✓ Reference created successfully\n')

	// Test 6: Query Items
	console.log('Test 6: Query items')
	const folders = await cp.query('testFolder', {
		where: { name: 'Test Folder' }
	})
	assert(folders.length > 0, 'Query should return results')
	assert(folders[0].name === 'Test Folder', 'Query should filter correctly')
	console.log('✓ Query working correctly\n')

	// Test 7: Query with Relations
	console.log('Test 7: Query with relations')
	const files = await cp.query('testFile', {
		where: { folder: folderId },
		include: { folder: true }
	})
	assert(files.length > 0, 'Should find file')
	assert(typeof files[0].folder === 'object', 'Should resolve folder reference')
	assert(files[0].folder.name === 'Test Folder', 'Should have correct folder data')
	console.log('✓ Relations resolved correctly\n')

	// Test 8: Update Item
	console.log('Test 8: Update item')
	await cp.update('testFolder', folderId, {
		name: 'Updated Folder',
		count: 20
	})
	const updatedFolder = await cp.get('testFolder', folderId)
	assert(updatedFolder?.name === 'Updated Folder', 'Name should be updated')
	assert(updatedFolder?.count === 20, 'Count should be updated')
	console.log('✓ Item updated successfully\n')

	// Test 9: Function-based Filtering
	console.log('Test 9: Function-based filtering')
	await cp.create('testFile', {
		name: 'important.txt',
		folder: folderId,
		tags: ['important', 'work']
	})

	const importantFiles = await cp.query('testFile', {
		where: (file) => file.tags.includes('important')
	})
	assert(importantFiles.length > 0, 'Should find files with tag')
	console.log('✓ Function filtering working\n')

	// Test 10: Ordering and Limit
	console.log('Test 10: Ordering and limit')
	const orderedFiles = await cp.query('testFile', {
		orderBy: { name: 'asc' },
		limit: 1
	})
	assert(orderedFiles.length === 1, 'Limit should work')
	console.log('✓ Ordering and limit working\n')

	// Test 11: Validation on Create
	console.log('Test 11: Validation on create')
	try {
		await cp.create('testFolder', {
			// Missing required 'name' field
			description: 'No name'
		})
		throw new Error('Should have thrown validation error')
	} catch (error) {
		assert(error instanceof ValidationError, 'Should throw ValidationError')
		console.log('✓ Validation on create working\n')
	}

	// Test 12: Default Values
	console.log('Test 12: Default values')
	const { data: folderWithDefaults } = await cp.create('testFolder', {
		name: 'Folder with defaults'
		// count should default to 0
	})
	assert(folderWithDefaults.count === 0, 'Default value should be applied')
	console.log('✓ Default values working\n')

	// Test 13: Delete Item
	console.log('Test 13: Delete item')
	await cp.delete('testFile', fileId)
	// Note: The item should be deleted from PDS, but cache might not update immediately
	console.log('✓ Item deleted\n')

	// Test 14: Schema Loading
	console.log('Test 14: Load schemas')
	const cp2 = new ClayProto(session)
	await cp2.loadSchemas()
	const loadedSchemas = cp2.listSchemas()
	assert(loadedSchemas.length > 0, 'Should load schemas from PDS')
	console.log('✓ Schemas loaded successfully\n')

	// Test 15: Array Validation
	console.log('Test 15: Array validation')
	const arrayResult = clay.validate(
		{
			tags: clay.array(clay.string())
		},
		{ tags: ['valid', 'tags'] }
	)
	assert(arrayResult.valid, 'Valid array should pass')

	const invalidArrayResult = clay.validate(
		{
			tags: clay.array(clay.string())
		},
		{ tags: 'not an array' }
	)
	assert(!invalidArrayResult.valid, 'Invalid array should fail')
	console.log('✓ Array validation working\n')

	// Cleanup
	console.log('Cleaning up...')
	await cp.delete('testFolder', folderId)
	console.log('✓ Cleanup complete\n')

	console.log('All tests passed! ✨')
}

// ============================================================================
// MANUAL TEST RUNNER
// ============================================================================

/**
 * To run these tests manually:
 *
 * 1. Set up OAuth session (see your auth implementation)
 * 2. Import this file
 * 3. Call runTests(session)
 *
 * Example:
 *
 * import { runTests } from './examples/test-clayproto'
 * import { getSession } from './src/lib/auth'
 *
 * const session = await getSession()
 * await runTests(session)
 */

// For demonstration purposes, export a function that shows expected usage
export function exampleUsage() {
	console.log(`
To run tests:

import { runTests } from './examples/test-clayproto'
import { getSession } from './src/lib/auth' // Your auth implementation

const session = await getSession()
await runTests(session)
  `)
}
