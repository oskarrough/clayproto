<script lang="ts">
	import {dev} from '$app/environment'
	import {session, refreshSession} from '$lib/session'
	import {atprotoOAuth} from '$lib/atproto-oauth'

	let handle = $state(dev ? 'username.bsky.social' : '')
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

<main>
	<p>clayproto/</p>
	{#if $session}
		<main>
			<p>@{$session.handle}/</p>
			<main>
				<p><span class="mono">├─</span> <a href="/schemas">schemas/</a></p>
				<p>
					<span class="mono">└─</span>
					<button data-text type="button" onclick={signOut}>logout</button>
				</p>
			</main>
		</main>
	{:else}
		<main>
			<form onsubmit={signIn}>
				<p>
					<span class="mono">└─</span>
					<input
						type="text"
						bind:value={handle}
						placeholder="you.bsky.social"
						disabled={signingIn}
						required
					/>
					<button type="submit" disabled={signingIn}
						>{#if signingIn}<em>signing in...</em>{:else}sign in{/if}</button
					>
				</p>
			</form>
			{#if error}
				<p><strong>! {error}</strong></p>
			{/if}
		</main>
	{/if}
</main>
