/**
 * Basic usage of clay
 */

import {clay, tid, SCHEMA, ITEM} from '../src/lib/clayproto'

// Create a schema
const schemaRkey = await clay.putRecord(SCHEMA, tid(), {
	$type: SCHEMA,
	name: 'task',
	fields: [
		{name: 'title', type: 'string', required: true},
		{name: 'done', type: 'boolean'},
		{name: 'tags', type: 'array'}
	],
	createdAt: new Date().toISOString()
})

// Create items
const item1 = await clay.putRecord(ITEM, tid(), {
	$type: ITEM,
	schema: schemaRkey,
	data: {title: 'Buy groceries', done: false, tags: ['personal']},
	createdAt: new Date().toISOString()
})

await clay.putRecord(ITEM, tid(), {
	$type: ITEM,
	schema: schemaRkey,
	data: {title: 'Write docs', done: true, tags: ['work']},
	createdAt: new Date().toISOString()
})

// List items
const items = await clay.listRecords(ITEM)
console.log(items)

// Get single item
const task = await clay.getRecord(ITEM, item1)
console.log(task)

// Update item
await clay.putRecord(ITEM, item1, {
	$type: ITEM,
	schema: schemaRkey,
	data: {...(task as {data: object}).data, done: true},
	createdAt: (task as {createdAt: string}).createdAt
})

// Delete item
await clay.deleteRecord(ITEM, item1)

// List schemas
const schemas = await clay.listRecords(SCHEMA)
console.log(schemas)

// Update schema
const existingSchema = await clay.getRecord(SCHEMA, schemaRkey)
await clay.putRecord(SCHEMA, schemaRkey, {
	$type: SCHEMA,
	name: 'task',
	fields: [
		{name: 'title', type: 'string', required: true},
		{name: 'done', type: 'boolean'},
		{name: 'tags', type: 'array'},
		{name: 'priority', type: 'number'}
	],
	createdAt: (existingSchema as {createdAt: string}).createdAt
})

// Delete schema
await clay.deleteRecord(SCHEMA, schemaRkey)
