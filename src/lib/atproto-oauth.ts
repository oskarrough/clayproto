import {NodeOAuthClient} from '@atproto/oauth-client-node'

export const oauthClient = new NodeOAuthClient({
	clientMetadata: {
		client_id: `http://localhost:5173/client-metadata.json`,
		client_name: 'clayproto',
		client_uri: 'http://localhost:5173',
		redirect_uris: ['http://localhost:5173/auth/callback'],
		scope: 'atproto transition:generic',
		grant_types: ['authorization_code', 'refresh_token'],
		response_types: ['code'],
		application_type: 'web',
		token_endpoint_auth_method: 'none',
		dpop_bound_access_tokens: true
	},
	handleResolver: 'https://bsky.social'
})
