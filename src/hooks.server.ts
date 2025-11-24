import { oauthClient } from '$lib/atproto/oauth'
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
	const did = event.cookies.get('did')

	if (did) {
		try {
			const session = await oauthClient.restore(did)
			event.locals.session = session
			event.locals.did = did
		} catch (err) {
			console.error('Failed to restore session:', err)
			event.cookies.delete('did', { path: '/' })
		}
	}

	return resolve(event)
}
