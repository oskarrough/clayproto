<script lang="ts">
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
</script>

<h1>Schemas</h1>

<form method="get" action="/schemas/new">
	<button type="submit">Create New Schema</button>
</form>

{#if data.schemas.length === 0}
	<p>No schemas yet. Create your first schema to get started.</p>
{:else}
	<ul>
		{#each data.schemas as { rkey, schema } (rkey)}
			<li>
				<strong>{schema.title}</strong> ({schema.nsid})
				{#if schema.description}
					<p>{schema.description}</p>
				{/if}
				<p>{schema.fields.length} fields</p>
			</li>
		{/each}
	</ul>
{/if}
