import {Agent} from '@atproto/api'
import {TID} from '@atproto/common-web'
import {atprotoOAuth} from './atproto-oauth'

const schemaCollection = 'app.clayproto.schema'
const itemCollection = 'app.clayproto.item'
const publicAgent = new Agent({service: 'https://public.api.bsky.app'})

export interface SchemaField {
	name: string
	type: 'string' | 'number' | 'boolean' | 'array'
	items?: string
	required?: boolean
}

export interface SchemaDefinition {
	$type: typeof schemaCollection
	name: string
	description?: string
	fields: SchemaField[]
	createdAt: string
}

export interface ItemData {
	$type: typeof itemCollection
	schema: string
	data: Record<string, unknown>
	createdAt: string
}

const getAgent = () => {
	if (!atprotoOAuth.agent) throw new Error('Not authenticated')
	return atprotoOAuth.agent
}

const getDid = () => {
	if (!atprotoOAuth.session?.did) throw new Error('Not authenticated')
	return atprotoOAuth.session.did
}

const agentFor = (did?: string) => (did ? publicAgent : getAgent())
const didFor = (did?: string) => did || getDid()
const extractRkey = (uri: string) => uri.split('/').pop()!

export const clayprotoSDK = {
	get did() {
		return getDid()
	},

	get isAuthenticated() {
		return atprotoOAuth.isAuthenticated()
	},

	// Schema CRUD
	async createSchema(schema: Omit<SchemaDefinition, '$type' | 'createdAt'>) {
		const record: SchemaDefinition = {
			$type: schemaCollection,
			...schema,
			createdAt: new Date().toISOString()
		}
		const response = await getAgent().com.atproto.repo.putRecord({
			repo: getDid(),
			collection: schemaCollection,
			rkey: TID.nextStr(),
			record: record as unknown as Record<string, unknown>
		})
		return {rkey: extractRkey(response.data.uri), record}
	},

	async getSchema(rkey: string, did?: string) {
		const response = await agentFor(did).com.atproto.repo.getRecord({
			repo: didFor(did),
			collection: schemaCollection,
			rkey
		})
		return response.data.value as unknown as SchemaDefinition
	},

	async listSchemas(did?: string) {
		const response = await agentFor(did).com.atproto.repo.listRecords({
			repo: didFor(did),
			collection: schemaCollection
		})
		return response.data.records.map((r) => ({
			rkey: extractRkey(r.uri),
			schema: r.value as unknown as SchemaDefinition
		}))
	},

	async updateSchema(rkey: string, schema: Omit<SchemaDefinition, '$type' | 'createdAt'>) {
		const record: SchemaDefinition = {
			$type: schemaCollection,
			...schema,
			createdAt: new Date().toISOString()
		}
		await getAgent().com.atproto.repo.putRecord({
			repo: getDid(),
			collection: schemaCollection,
			rkey,
			record: record as unknown as Record<string, unknown>
		})
		return {rkey, record}
	},

	async deleteSchema(rkey: string) {
		await getAgent().com.atproto.repo.deleteRecord({
			repo: getDid(),
			collection: schemaCollection,
			rkey
		})
	},

	// Item CRUD
	async createItem(schema: string, data: Record<string, unknown>) {
		const record: ItemData = {
			$type: itemCollection,
			schema,
			data,
			createdAt: new Date().toISOString()
		}
		const response = await getAgent().com.atproto.repo.putRecord({
			repo: getDid(),
			collection: itemCollection,
			rkey: TID.nextStr(),
			record: record as unknown as Record<string, unknown>
		})
		return {rkey: extractRkey(response.data.uri), record}
	},

	async getItem(rkey: string, did?: string) {
		const response = await agentFor(did).com.atproto.repo.getRecord({
			repo: didFor(did),
			collection: itemCollection,
			rkey
		})
		return response.data.value as unknown as ItemData
	},

	async listItems(did?: string) {
		const response = await agentFor(did).com.atproto.repo.listRecords({
			repo: didFor(did),
			collection: itemCollection
		})
		return response.data.records.map((r) => ({
			rkey: extractRkey(r.uri),
			item: r.value as unknown as ItemData
		}))
	},

	async listItemsBySchema(schema: string, did?: string) {
		const items = await this.listItems(did)
		return items.filter((i) => i.item.schema === schema)
	},

	async updateItem(rkey: string, schema: string, data: Record<string, unknown>) {
		const record: ItemData = {
			$type: itemCollection,
			schema,
			data,
			createdAt: new Date().toISOString()
		}
		await getAgent().com.atproto.repo.putRecord({
			repo: getDid(),
			collection: itemCollection,
			rkey,
			record: record as unknown as Record<string, unknown>
		})
		return {rkey, record}
	},

	async deleteItem(rkey: string) {
		await getAgent().com.atproto.repo.deleteRecord({
			repo: getDid(),
			collection: itemCollection,
			rkey
		})
	}
}
