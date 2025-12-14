<script lang="ts">
	import {onMount} from 'svelte'
	import {goto} from '$app/navigation'
	import {session} from '$lib/session'
	import {clay, SCHEMA, type Schema} from '$lib/clayproto'

	let schemas = $state<{rkey: string; schema: Schema}[]>([])
	let loading = $state(true)
	let error = $state('')

	onMount(async () => {
		if (!$session) {
			goto('/')
			return
		}

		try {
			const records = await clay.listRecords(SCHEMA)
			schemas = records.map((r) => ({rkey: r.rkey, schema: r.value as Schema}))
		} catch (err) {
			error = (err as Error).message
		} finally {
			loading = false
		}
	})
</script>

<nav>
	<p><a href="/">clayproto/</a></p>
	<nav>
		<p>@{$session?.handle}/</p>
		<nav>
			<div>
				schemas/
				<menu><a href="/schemas/new">+new</a></menu>
			</div>
			<nav>
				{#if loading}
					<p><em>loading...</em></p>
				{:else if error}
					<p><strong>! {error}</strong></p>
				{:else if schemas.length === 0}
					<p><em>(empty)</em></p>
				{:else}
					{#each schemas as { rkey, schema } (rkey)}
						<p><a href="/schemas/{rkey}">{schema.name || `(${rkey})`}/</a></p>
					{/each}
				{/if}
			</nav>
		</nav>
	</nav>
</nav>
