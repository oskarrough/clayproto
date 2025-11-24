import {BrowserOAuthClient} from '@atproto/oauth-client-browser'
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
	initialized = false
	initPromise: Promise<void> | null = null

	async init(clientId: string): Promise<void> {
		if (this.initialized) return
		if (this.initPromise) return this.initPromise

		this.initPromise = this.#initInternal(clientId).finally(() => {
			this.initPromise = null
		})
		return this.initPromise
	}

	async #initInternal(clientId: string): Promise<void> {
		if (this.initialized) return

		this.client = await BrowserOAuthClient.load({
			clientId,
			handleResolver: 'https://bsky.social'
		})

		// Handle OAuth callback if present in URL
		const params = this.client.readCallbackParams()
		if (params) {
			try {
				const {session} = await this.client.initCallback(params)
				await this.#hydrateSession(session)
			} catch (err) {
				// Clear URL params on error
				history.replaceState(null, '', location.pathname)
				console.error('OAuth callback failed:', err)
			}
		}

		this.initialized = true
	}

	async signIn(handle: string): Promise<void> {
		if (!this.client) throw new Error('OAuth client not initialized')

		await this.client.signIn(handle, {
			state: window.location.pathname,
			scope: 'atproto transition:generic'
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
			try {
				await this.client.revoke(this.session.did)
			} catch (err) {
				console.error('Revoke error:', err)
			}
		}

		this.agent = null
		this.session = null
		localStorage.removeItem('atproto-did')
	}

	getStoredDid(): string | null {
		try {
			return localStorage.getItem('atproto-did')
		} catch {
			return null
		}
	}

	isAuthenticated(): boolean {
		return !!this.agent && !!this.session
	}

	async #hydrateSession(oauthSession: OAuthSession): Promise<void> {
		this.agent = new Agent(oauthSession)

		// Try to resolve handle
		let handle = oauthSession.did
		try {
			const publicAgent = new Agent({service: 'https://public.api.bsky.app'})
			const profile = await publicAgent.getProfile({actor: oauthSession.did})
			handle = profile.data?.handle || handle
		} catch {
			// Use DID as handle fallback
		}

		this.session = {did: oauthSession.did, handle}
		localStorage.setItem('atproto-did', oauthSession.did)
	}
}

export const atprotoOAuth = new AtprotoOAuthService()

// Helper to build client ID for dev vs prod
export function buildClientId(): string {
	const {protocol, host} = window.location
	if (protocol === 'http:') {
		// Loopback client for local dev
		return `http://localhost?redirect_uri=${encodeURIComponent(`${protocol}//${host}/`)}&scope=${encodeURIComponent('atproto transition:generic')}`
	}
	// Production: use client-metadata.json
	return `${protocol}//${host}/client-metadata.json`
}
