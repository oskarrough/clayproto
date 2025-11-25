/**
 * Basic usage of clayproto-sdk
 */

import {clayprotoSDK} from '../src/lib/clayproto-sdk'

// Create a schema
const {rkey: schemaRkey} = await clayprotoSDK.createSchema({
	name: 'task',
	fields: [
		{name: 'title', type: 'string', required: true},
		{name: 'done', type: 'boolean'},
		{name: 'tags', type: 'array', items: 'string'}
	]
})

// Create items (using schema rkey)
const {rkey: item1} = await clayprotoSDK.createItem(schemaRkey, {
	title: 'Buy groceries',
	done: false,
	tags: ['personal']
})

await clayprotoSDK.createItem(schemaRkey, {
	title: 'Write docs',
	done: true,
	tags: ['work']
})

// List items
const items = await clayprotoSDK.listItems()

// Get single item
const task = await clayprotoSDK.getItem(item1)

// Update item
await clayprotoSDK.updateItem(item1, schemaRkey, {
	...task.data,
	done: true
})

// Delete item
await clayprotoSDK.deleteItem(item1)

// List schemas
const schemas = await clayprotoSDK.listSchemas()

// Update schema
await clayprotoSDK.updateSchema(schemaRkey, {
	name: 'task',
	fields: [
		{name: 'title', type: 'string', required: true},
		{name: 'done', type: 'boolean'},
		{name: 'tags', type: 'array', items: 'string'},
		{name: 'priority', type: 'number'}
	]
})

// Delete schema
await clayprotoSDK.deleteSchema(schemaRkey)
