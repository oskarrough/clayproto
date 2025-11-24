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

<h1>Schemas</h1>

{#if loading}
	<p>Loading...</p>
{:else if error}
	<p style="color: red">{error}</p>
{:else if schemas.length === 0}
	<p>No schemas yet. <a href="/schemas/new">Create your first schema</a></p>
{:else}
	<p><a href="/schemas/new">Create New Schema</a></p>
	<ul>
		{#each schemas as { rkey, schema } (rkey)}
			<li>
				<a href="/schemas/{rkey}">
					<strong>{schema.title}</strong> ({schema.nsid})
				</a>
				{#if schema.description}
					<p>{schema.description}</p>
				{/if}
				<p>{schema.fields.length} fields</p>
			</li>
		{/each}
	</ul>
{/if}

<p><a href="/">← Home</a></p>
