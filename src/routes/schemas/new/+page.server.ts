import { ClayprotoSDK } from '$lib/atproto/sdk'
import { redirect, fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) {
		throw redirect(302, '/')
	}
	return {}
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.session) {
			throw redirect(302, '/')
		}

		const formData = await request.formData()
		const nsid = formData.get('nsid')
		const title = formData.get('title')
		const description = formData.get('description')
		const fieldsJson = formData.get('fields')

		if (!nsid || !title || !fieldsJson) {
			return fail(400, { error: 'Missing required fields' })
		}

		try {
			const fields = JSON.parse(fieldsJson as string)
			const sdk = new ClayprotoSDK(locals.session)

			await sdk.createSchema({
				nsid: nsid as string,
				title: title as string,
				description: description ? (description as string) : undefined,
				fields
			})

			throw redirect(303, '/schemas')
		} catch (err) {
			console.error('Failed to create schema:', err)
			return fail(500, { error: 'Failed to create schema' })
		}
	}
}
