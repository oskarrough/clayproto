import {writable} from 'svelte/store'
import {atprotoOAuth, type Session} from './atproto-oauth'

export const session = writable<Session | null>(null)

export const refreshSession = () => session.set(atprotoOAuth.session)
export const clearSession = () => session.set(null)
