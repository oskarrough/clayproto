import {ClayprotoSDK} from '$lib/atproto/sdk'
import {ClayProto, ValidationError} from '$lib/clayproto'
import {fail, redirect} from '@sveltejs/kit'
import type {Actions, PageServerLoad} from './$types'

export const load: PageServerLoad = async ({locals, url}) => {
	if (!locals.session) {
		throw redirect(302, '/')
	}

	const schemaRkey = url.searchParams.get('schema')
	if (!schemaRkey) {
		throw redirect(302, '/schemas')
	}

	const sdk = new ClayprotoSDK(locals.session)
	const schemas = await sdk.listSchemas()
	const schemaRecord = schemas.find((s) => s.rkey === schemaRkey)

	if (!schemaRecord) {
		throw redirect(302, '/schemas')
	}

	return {
		schema: schemaRecord
	}
}

export const actions = {
	default: async ({locals, request, url}) => {
		if (!locals.session) {
			throw redirect(302, '/')
		}

		const schemaRkey = url.searchParams.get('schema')
		if (!schemaRkey) {
			return fail(400, {error: 'Schema not specified'})
		}

		const formData = await request.formData()
		const dataJson = formData.get('data')

		if (!dataJson || typeof dataJson !== 'string') {
			return fail(400, {error: 'Invalid form data'})
		}

		try {
			const data = JSON.parse(dataJson)
			const cp = new ClayProto(locals.session)
			await cp.loadSchemas()

			// Extract schema name from NSID
			const sdk = new ClayprotoSDK(locals.session)
			const schemas = await sdk.listSchemas()
			const schemaRecord = schemas.find((s) => s.rkey === schemaRkey)

			if (!schemaRecord) {
				return fail(404, {error: 'Schema not found'})
			}

			const schemaName =
				schemaRecord.schema.nsid.split('.').pop() || schemaRecord.schema.title.toLowerCase()

			await cp.create(schemaName, data)

			throw redirect(303, '/items')
		} catch (error) {
			if (error instanceof ValidationError) {
				return fail(400, {errors: error.errors})
			}
			throw error
		}
	}
} satisfies Actions
