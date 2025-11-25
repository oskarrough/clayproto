import {Agent} from '@atproto/api'
import {TID} from '@atproto/common-web'
import {atprotoOAuth} from './atproto-oauth'

// Collections
export const SCHEMA = 'app.clayproto.schema'
export const ITEM = 'app.clayproto.item'

// Types
export interface SchemaField {
	name: string
	type: 'string' | 'number' | 'boolean' | 'array'
	items?: string
	required?: boolean
}

export interface Schema {
	$type: typeof SCHEMA
	name: string
	fields: SchemaField[]
	createdAt: string
}

export interface Item {
	$type: typeof ITEM
	schema: string
	data: Record<string, unknown>
	createdAt: string
}

// Helpers
const publicAgent = new Agent({service: 'https://public.api.bsky.app'})
const agent = () => {
	if (!atprotoOAuth.agent) throw new Error('Not authenticated')
	return atprotoOAuth.agent
}
const did = () => {
	if (!atprotoOAuth.session?.did) throw new Error('Not authenticated')
	return atprotoOAuth.session.did
}

export const rkey = (uri: string) => uri.split('/').pop()!
export const tid = () => TID.nextStr()

export const clay = {
	get did() {
		return did()
	},

	async listRecords(collection: string, otherDid?: string) {
		const a = otherDid ? publicAgent : agent()
		const d = otherDid || did()
		const response = await a.com.atproto.repo.listRecords({repo: d, collection})
		return response.data.records.map((r) => ({
			rkey: rkey(r.uri),
			value: r.value as Record<string, unknown>
		}))
	},

	async getRecord(collection: string, recordRkey: string, otherDid?: string) {
		const a = otherDid ? publicAgent : agent()
		const d = otherDid || did()
		const response = await a.com.atproto.repo.getRecord({repo: d, collection, rkey: recordRkey})
		return response.data.value as Record<string, unknown>
	},

	async putRecord(collection: string, recordRkey: string, record: Record<string, unknown>) {
		const response = await agent().com.atproto.repo.putRecord({
			repo: did(),
			collection,
			rkey: recordRkey,
			record
		})
		return rkey(response.data.uri)
	},

	async deleteRecord(collection: string, recordRkey: string) {
		await agent().com.atproto.repo.deleteRecord({
			repo: did(),
			collection,
			rkey: recordRkey
		})
	}
}
