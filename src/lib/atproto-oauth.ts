import {BrowserOAuthClient, buildLoopbackClientId} from '@atproto/oauth-client-browser'
import type {OAuthSession} from '@atproto/oauth-client-browser'
import {Agent} from '@atproto/api'

export interface Session {
	did: string
	handle: string
}

class AtprotoOAuthService {
	client: BrowserOAuthClient | null = null
	agent: Agent | null = null
	session: Session | null = null
	private initPromise: Promise<void> | null = null

	async init(clientId: string): Promise<void> {
		if (this.client) return
		return (this.initPromise ??= BrowserOAuthClient.load({
			clientId,
			handleResolver: 'https://bsky.social'
		}).then((client) => {
			this.client = client
		}))
	}

	async handleCallback(): Promise<boolean> {
		if (!this.client) return false

		const params = this.client.readCallbackParams()
		if (!params) return false

		try {
			const {session} = await this.client.initCallback(params)
			await this.#hydrateSession(session)
			return true
		} catch (err) {
			console.error('OAuth callback failed:', err)
			return false
		}
	}

	async signIn(handle: string): Promise<void> {
		if (!this.client) throw new Error('OAuth client not initialized')
		await this.client.signIn(handle, {
			state: window.location.pathname
		})
	}

	async restoreSession(did: string): Promise<boolean> {
		if (!this.client) throw new Error('OAuth client not initialized')

		try {
			const oauthSession = await this.client.restore(did)
			if (!oauthSession) return false

			await this.#hydrateSession(oauthSession)
			return true
		} catch (err) {
			console.error('Session restore failed:', err)
			localStorage.removeItem('atproto-did')
			return false
		}
	}

	async signOut(): Promise<void> {
		if (this.session?.did && this.client) {
			await this.client.revoke(this.session.did).catch(console.error)
		}
		this.agent = null
		this.session = null
		localStorage.removeItem('atproto-did')
	}

	getStoredDid = () => localStorage.getItem('atproto-did')
	isAuthenticated = () => !!(this.agent && this.session)

	async #hydrateSession(oauthSession: OAuthSession): Promise<void> {
		this.agent = new Agent(oauthSession)

		// Try to resolve handle
		let handle: string = oauthSession.did
		try {
			const publicAgent = new Agent({service: 'https://public.api.bsky.app'})
			const profile = await publicAgent.getProfile({actor: oauthSession.did as `did:plc:${string}`})
			handle = profile.data?.handle || handle
		} catch {
			// Use DID as handle fallback
		}

		this.session = {did: oauthSession.did, handle}
		localStorage.setItem('atproto-did', oauthSession.did)
	}
}

export const atprotoOAuth = new AtprotoOAuthService()

/** Scopes for clayproto - identity + schema/item CRUD */
const scopes = [
	'atproto',
	'repo:app.clayproto.schema?action=create',
	'repo:app.clayproto.schema?action=update',
	'repo:app.clayproto.schema?action=delete',
	'repo:app.clayproto.item?action=create',
	'repo:app.clayproto.item?action=update',
	'repo:app.clayproto.item?action=delete'
].join(' ')

/** Helper to build client ID for dev vs prod */
export function buildClientId(): string {
	if (window.location.protocol === 'http:') {
		// Loopback client for local dev - must use 127.0.0.1, not localhost
		const loc = {
			hostname: '127.0.0.1',
			pathname: '/',
			port: window.location.port
		}
		const base = buildLoopbackClientId(loc)
		return `${base}&scope=${encodeURIComponent(scopes)}`
	}
	// Production: use client-metadata.json
	return `${window.location.protocol}//${window.location.host}/client-metadata.json`
}
