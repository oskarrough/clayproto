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

	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;1,100;1,200;1,300;1,400;1,500;1,600;1,700&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<main>
	{#if ready}
		{@render children()}
	{:else}
		<p>Loading...</p>
	{/if}
</main>

<style>
	main,
	footer {
		margin: 1rem;
	}
</style>
