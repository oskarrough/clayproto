<script lang="ts">
	import {onMount} from 'svelte'
	import favicon from '$lib/assets/favicon.svg'
	import {atprotoOAuth, buildClientId} from '$lib/atproto-oauth'
	import {session} from '$lib/session'

	let {children} = $props()
	let ready = $state(false)

	onMount(async () => {
		try {
			const clientId = buildClientId()
			await atprotoOAuth.init(clientId)

			// Restore session if we have a stored DID
			if (!atprotoOAuth.session) {
				const did = atprotoOAuth.getStoredDid()
				if (did) {
					await atprotoOAuth.restoreSession(did)
				}
			}

			session.refresh()
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

{#if ready}
	{@render children()}
{:else}
	<p>Loading...</p>
{/if}
