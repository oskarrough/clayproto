import {Agent} from '@atproto/api'
import {TID} from '@atproto/common-web'
import {atprotoOAuth} from './atproto-oauth'

const schemaCollection = 'app.clayproto.schema'
const itemCollection = 'app.clayproto.item'

export interface SchemaField {
	name: string
	type: 'string' | 'number' | 'boolean' | 'array'
	items?: string
	required?: boolean
}

export interface SchemaDefinition {
	$type: typeof schemaCollection
	nsid: string
	title: string
	description?: string
	fields: SchemaField[]
	createdAt: string
}

export interface ItemData {
	$type: typeof itemCollection
	schemaType: string
	data: Record<string, unknown>
	createdAt: string
}

function getAgent(): Agent {
	if (!atprotoOAuth.agent) {
		throw new Error('Not authenticated')
	}
	return atprotoOAuth.agent
}

function getDid(): string {
	if (!atprotoOAuth.session?.did) {
		throw new Error('Not authenticated')
	}
	return atprotoOAuth.session.did
}

// Public agent for reading others' data
const publicAgent = new Agent({service: 'https://public.api.bsky.app'})

export const clayprotoSDK = {
	get did() {
		return getDid()
	},

	get isAuthenticated() {
		return atprotoOAuth.isAuthenticated()
	},

	// Schema CRUD
	async createSchema(schema: Omit<SchemaDefinition, '$type' | 'createdAt'>) {
		const agent = getAgent()
		const record: SchemaDefinition = {
			$type: schemaCollection,
			nsid: schema.nsid,
			title: schema.title,
			description: schema.description,
			fields: schema.fields,
			createdAt: new Date().toISOString()
		}

		const response = await agent.com.atproto.repo.putRecord({
			repo: getDid(),
			collection: schemaCollection,
			rkey: TID.nextStr(),
			record: record as unknown as Record<string, unknown>
		})

		return {rkey: response.data.uri.split('/').pop()!, record}
	},

	async getSchema(rkey: string, did?: string) {
		const targetDid = did || getDid()
		const agent = did ? publicAgent : getAgent()

		const response = await agent.com.atproto.repo.getRecord({
			repo: targetDid,
			collection: schemaCollection,
			rkey
		})

		return response.data.value as unknown as SchemaDefinition
	},

	async listSchemas(did?: string) {
		const targetDid = did || getDid()
		const agent = did ? publicAgent : getAgent()

		const response = await agent.com.atproto.repo.listRecords({
			repo: targetDid,
			collection: schemaCollection
		})

		return response.data.records.map((record) => ({
			rkey: record.uri.split('/').pop()!,
			schema: record.value as unknown as SchemaDefinition
		}))
	},

	async updateSchema(rkey: string, schema: Omit<SchemaDefinition, '$type' | 'createdAt'>) {
		const agent = getAgent()
		const record: SchemaDefinition = {
			$type: schemaCollection,
			nsid: schema.nsid,
			title: schema.title,
			description: schema.description,
			fields: schema.fields,
			createdAt: new Date().toISOString()
		}

		await agent.com.atproto.repo.putRecord({
			repo: getDid(),
			collection: schemaCollection,
			rkey,
			record: record as unknown as Record<string, unknown>
		})

		return {rkey, record}
	},

	async deleteSchema(rkey: string) {
		const agent = getAgent()
		await agent.com.atproto.repo.deleteRecord({
			repo: getDid(),
			collection: schemaCollection,
			rkey
		})
	},

	// Item CRUD
	async createItem(schemaType: string, data: Record<string, unknown>) {
		const agent = getAgent()
		const record: ItemData = {
			$type: itemCollection,
			schemaType,
			data,
			createdAt: new Date().toISOString()
		}

		const response = await agent.com.atproto.repo.putRecord({
			repo: getDid(),
			collection: itemCollection,
			rkey: TID.nextStr(),
			record: record as unknown as Record<string, unknown>
		})

		return {rkey: response.data.uri.split('/').pop()!, record}
	},

	async getItem(rkey: string, did?: string) {
		const targetDid = did || getDid()
		const agent = did ? publicAgent : getAgent()

		const response = await agent.com.atproto.repo.getRecord({
			repo: targetDid,
			collection: itemCollection,
			rkey
		})

		return response.data.value as unknown as ItemData
	},

	async listItems(did?: string) {
		const targetDid = did || getDid()
		const agent = did ? publicAgent : getAgent()

		const response = await agent.com.atproto.repo.listRecords({
			repo: targetDid,
			collection: itemCollection
		})

		return response.data.records.map((record) => ({
			rkey: record.uri.split('/').pop()!,
			item: record.value as unknown as ItemData
		}))
	},

	async listItemsBySchema(schemaType: string, did?: string) {
		const items = await this.listItems(did)
		return items.filter((item) => item.item.schemaType === schemaType)
	},

	async updateItem(rkey: string, schemaType: string, data: Record<string, unknown>) {
		const agent = getAgent()
		const record: ItemData = {
			$type: itemCollection,
			schemaType,
			data,
			createdAt: new Date().toISOString()
		}

		await agent.com.atproto.repo.putRecord({
			repo: getDid(),
			collection: itemCollection,
			rkey,
			record: record as unknown as Record<string, unknown>
		})

		return {rkey, record}
	},

	async deleteItem(rkey: string) {
		const agent = getAgent()
		await agent.com.atproto.repo.deleteRecord({
			repo: getDid(),
			collection: itemCollection,
			rkey
		})
	}
}
