import { ClayprotoSDK } from '$lib/atproto/sdk'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session) {
		throw redirect(302, '/')
	}

	const sdk = new ClayprotoSDK(locals.session)
	const schemas = await sdk.listSchemas()

	return { schemas }
}
