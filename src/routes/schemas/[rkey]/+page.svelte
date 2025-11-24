<script lang="ts">
	import {onMount} from 'svelte'
	import {goto} from '$app/navigation'
	import {page} from '$app/stores'
	import {session} from '$lib/session'
	import {clayprotoSDK, type SchemaDefinition, type ItemData} from '$lib/clayproto-sdk'

	let schema = $state<SchemaDefinition | null>(null)
	let items = $state<{rkey: string; item: ItemData}[]>([])
	let loading = $state(true)
	let error = $state('')

	$effect(() => {
		if (!$session) {
			goto('/')
		}
	})

	onMount(async () => {
		if (!$session) return

		const rkey = $page.params.rkey

		try {
			schema = await clayprotoSDK.getSchema(rkey)
			const allItems = await clayprotoSDK.listItems()
			items = allItems.filter((item) => item.item.schemaType === schema!.nsid)
		} catch (err) {
			error = (err as Error).message
		} finally {
			loading = false
		}
	})
</script>

{#if loading}
	<p>Loading...</p>
{:else if error}
	<p style="color: red">{error}</p>
{:else if schema}
	<h1>{schema.title}</h1>
	<p><code>{schema.nsid}</code></p>

	{#if schema.description}
		<p>{schema.description}</p>
	{/if}

	<h2>Fields</h2>
	<table>
		<thead>
			<tr>
				<th>Name</th>
				<th>Type</th>
				<th>Required</th>
			</tr>
		</thead>
		<tbody>
			{#each schema.fields as field (field.name)}
				<tr>
					<td>{field.name}</td>
					<td>{field.type}{field.items ? `<${field.items}>` : ''}</td>
					<td>{field.required ? 'Yes' : 'No'}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<h2>Items</h2>
	<p><a href="/schemas/{$page.params.rkey}/new">+ New Item</a></p>

	{#if items.length === 0}
		<p>No items yet.</p>
	{:else}
		<ul>
			{#each items as {rkey, item} (rkey)}
				<li>
					{#each schema.fields.slice(0, 2) as field (field.name)}
						{#if item.data[field.name]}
							<span>{item.data[field.name]}</span>
						{/if}
					{/each}
				</li>
			{/each}
		</ul>
	{/if}
{/if}

<p><a href="/schemas">← Back to Schemas</a></p>
