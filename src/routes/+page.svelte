<script lang="ts">
	import {dev} from '$app/environment'
	import {session, refreshSession} from '$lib/session'
	import {atprotoOAuth} from '$lib/atproto-oauth'

	let handle = $state(dev ? 'oskarrough.bsky.social' : '')
	let signingIn = $state(false)
	let error = $state('')

	async function signIn(e: SubmitEvent) {
		e.preventDefault()
		if (!handle.trim()) return
		error = ''
		signingIn = true
		try {
			await atprotoOAuth.signIn(handle.trim())
		} catch (err) {
			error = (err as Error).message
			signingIn = false
		}
	}

	async function signOut() {
		await atprotoOAuth.signOut()
		refreshSession()
	}
</script>

<h1>clayproto</h1>
<p>Malleable, manpage-style, cool, usable, FREE software</p>

{#if $session}
	<p>Logged in as: {$session.handle}</p>
	<nav>
		<a href="/schemas">My Schemas</a>
	</nav>
	<button type="button" onclick={signOut}>Logout</button>
{:else}
	<form onsubmit={signIn}>
		<input
			type="text"
			bind:value={handle}
			placeholder="your-handle.bsky.social"
			disabled={signingIn}
			required
		/>
		<button type="submit" disabled={signingIn}>
			{signingIn ? 'Signing in...' : 'Sign in'}
		</button>
	</form>
	{#if error}
		<p style="color: red">{error}</p>
	{/if}
{/if}
