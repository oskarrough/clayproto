<script lang="ts">
	import {onMount} from 'svelte'
	import {goto} from '$app/navigation'
	import {session} from '$lib/session'
	import {clayprotoSDK, type SchemaDefinition} from '$lib/clayproto-sdk'

	let schemas = $state<{rkey: string; schema: SchemaDefinition}[]>([])
	let loading = $state(true)
	let error = $state('')

	onMount(async () => {
		if (!$session) {
			goto('/')
			return
		}

		try {
			schemas = await clayprotoSDK.listSchemas()
		} catch (err) {
			error = (err as Error).message
		} finally {
			loading = false
		}
	})
</script>

<main>
	<p><a href="/">clayproto/</a></p>
	<main>
		<p>@{$session?.handle}/</p>
		<main>
			<p>└─ schemas/</p>
			<main>
				{#if loading}
					<p><em>loading...</em></p>
				{:else if error}
					<p><strong>! {error}</strong></p>
				{:else}
					{#if schemas.length === 0}
						<p><em>(empty)</em></p>
					{:else}
						{#each schemas as { rkey, schema } (rkey)}
							<p>
								├─ <a href="/schemas/{rkey}">{schema.name || `(${rkey})`}/</a>
							</p>
						{/each}
					{/if}
					<p>└─ <a href="/schemas/new">+ new schema</a></p>
				{/if}
			</main>
		</main>
	</main>
</main>
