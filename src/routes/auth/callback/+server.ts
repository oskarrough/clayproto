import {oauthClient} from '$lib/atproto-oauth'
import {error, redirect} from '@sveltejs/kit'
import type {RequestHandler} from './$types'

export const GET: RequestHandler = async ({url, cookies}) => {
	const params = url.searchParams

	try {
		const {session} = await oauthClient.callback(params)
		const did = session.did

		// Store DID in session cookie
		cookies.set('did', did, {
			path: '/',
			httpOnly: true,
			secure: false, // Set to true in production
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 30 // 30 days
		})

		throw redirect(302, '/')
	} catch (err) {
		console.error('OAuth callback error:', err)
		throw error(500, 'Failed to complete OAuth flow')
	}
}
