<script lang="ts">
	import {onMount} from 'svelte'
	import {replaceState} from '$app/navigation'
	import favicon from '$lib/assets/favicon.svg'
	import {atprotoOAuth, buildClientId} from '$lib/atproto-oauth'
	import {refreshSession} from '$lib/session'
	import './style.css'

	let {children} = $props()
	let ready = $state(false)

	onMount(async () => {
		try {
			await atprotoOAuth.init(buildClientId())

			if (await atprotoOAuth.handleCallback()) {
				replaceState(window.location.pathname, {})
			}

			const did = atprotoOAuth.getStoredDid()
			if (!atprotoOAuth.session && did) {
				await atprotoOAuth.restoreSession(did)
			}

			refreshSession()
		} catch (err) {
			console.error('OAuth init error:', err)
		} finally {
			ready = true
		}
	})
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main>
	{#if ready}
		{@render children()}
	{:else}
		<p>Loading...</p>
	{/if}
</main>

<style>
	main {
		margin: 1rem;
	}
</style>
