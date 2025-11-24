import { Agent } from '@atproto/api'
import type { OAuthSession } from '@atproto/oauth-client-node'
import { TID } from '@atproto/common-web'

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

export class ClayprotoSDK {
	private agent: Agent

	constructor(session: OAuthSession) {
		this.agent = new Agent(session)
	}

	get did() {
		return this.agent.assertDid
	}

	// Schema CRUD
	async createSchema(schema: Omit<SchemaDefinition, '$type' | 'createdAt'>) {
		const record: SchemaDefinition = {
			$type: schemaCollection,
			...schema,
			createdAt: new Date().toISOString()
		}

		const response = await this.agent.com.atproto.repo.putRecord({
			repo: this.did,
			collection: schemaCollection,
			rkey: TID.nextStr(),
			record
		})

		return { rkey: response.data.uri.split('/').pop()!, record }
	}

	async getSchema(rkey: string) {
		const response = await this.agent.com.atproto.repo.getRecord({
			repo: this.did,
			collection: schemaCollection,
			rkey
		})

		return response.data.value as SchemaDefinition
	}

	async listSchemas(did?: string) {
		const response = await this.agent.com.atproto.repo.listRecords({
			repo: did || this.did,
			collection: schemaCollection
		})

		return response.data.records.map((record) => ({
			rkey: record.uri.split('/').pop()!,
			schema: record.value as SchemaDefinition
		}))
	}

	async updateSchema(rkey: string, schema: Omit<SchemaDefinition, '$type' | 'createdAt'>) {
		const record: SchemaDefinition = {
			$type: schemaCollection,
			...schema,
			createdAt: new Date().toISOString()
		}

		await this.agent.com.atproto.repo.putRecord({
			repo: this.did,
			collection: schemaCollection,
			rkey,
			record
		})

		return { rkey, record }
	}

	async deleteSchema(rkey: string) {
		await this.agent.com.atproto.repo.deleteRecord({
			repo: this.did,
			collection: schemaCollection,
			rkey
		})
	}

	// Item CRUD
	async createItem(schemaType: string, data: Record<string, unknown>) {
		const record: ItemData = {
			$type: itemCollection,
			schemaType,
			data,
			createdAt: new Date().toISOString()
		}

		const response = await this.agent.com.atproto.repo.putRecord({
			repo: this.did,
			collection: itemCollection,
			rkey: TID.nextStr(),
			record
		})

		return { rkey: response.data.uri.split('/').pop()!, record }
	}

	async getItem(rkey: string) {
		const response = await this.agent.com.atproto.repo.getRecord({
			repo: this.did,
			collection: itemCollection,
			rkey
		})

		return response.data.value as ItemData
	}

	async listItems(did?: string) {
		const response = await this.agent.com.atproto.repo.listRecords({
			repo: did || this.did,
			collection: itemCollection
		})

		return response.data.records.map((record) => ({
			rkey: record.uri.split('/').pop()!,
			item: record.value as ItemData
		}))
	}

	async updateItem(rkey: string, schemaType: string, data: Record<string, unknown>) {
		const record: ItemData = {
			$type: itemCollection,
			schemaType,
			data,
			createdAt: new Date().toISOString()
		}

		await this.agent.com.atproto.repo.putRecord({
			repo: this.did,
			collection: itemCollection,
			rkey,
			record
		})

		return { rkey, record }
	}

	async deleteItem(rkey: string) {
		await this.agent.com.atproto.repo.deleteRecord({
			repo: this.did,
			collection: itemCollection,
			rkey
		})
	}
}
