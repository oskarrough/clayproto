import {writable} from 'svelte/store'
import {atprotoOAuth, type Session} from './atproto-oauth'

function createSessionStore() {
	const {subscribe, set} = writable<Session | null>(null)

	return {
		subscribe,
		refresh() {
			set(atprotoOAuth.session)
		},
		clear() {
			set(null)
		}
	}
}

export const session = createSessionStore()
