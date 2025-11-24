// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type {OAuthSession} from '@atproto/oauth-client-node'

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session?: OAuthSession
			did?: string
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {}
