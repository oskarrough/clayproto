import {oauthClient} from '$lib/atproto-oauth'
import {error, redirect} from '@sveltejs/kit'
import type {RequestHandler} from './$types'

export const GET: RequestHandler = async ({url}) => {
	const handle = url.searchParams.get('handle')

	if (!handle) {
		throw error(400, 'Handle is required')
	}

	try {
		const authUrl = await oauthClient.authorize(handle, {
			scope: 'atproto transition:generic'
		})

		throw redirect(302, authUrl.toString())
	} catch (err) {
		console.error('OAuth authorization error:', err)
		throw error(500, 'Failed to initiate OAuth flow')
	}
}
