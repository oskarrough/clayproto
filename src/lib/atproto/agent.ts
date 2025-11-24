import { Agent } from '@atproto/api'
import type { OAuthSession } from '@atproto/oauth-client-node'

export function getAgent(session: OAuthSession): Agent {
	return new Agent(session)
}
