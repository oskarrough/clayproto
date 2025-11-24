<script lang="ts">
	import type {PageData} from './$types'

	let {data}: {data: PageData} = $props()
</script>

<h1>Items</h1>

{#if data.schemas.length === 0}
	<p>No schemas yet. <a href="/schemas/new">Create a schema</a> first.</p>
{:else}
	<div>
		<h2>Create New Item</h2>
		<ul>
			{#each data.schemas as { name, rkey } (rkey)}
				<li>
					<a href="/items/new?schema={rkey}">Create {name}</a>
				</li>
			{/each}
		</ul>
	</div>
{/if}

{#if data.items.length === 0}
	<p>No items yet.</p>
{:else}
	<h2>All Items</h2>
	<ul>
		{#each data.items as item (item.data._rkey)}
			<li>
				<strong>{item.schema}</strong>
				<pre>{JSON.stringify(item.data, null, 2)}</pre>
			</li>
		{/each}
	</ul>
{/if}
