<script lang="ts">
	import {onMount} from 'svelte'
	import {goto} from '$app/navigation'
	import {page} from '$app/stores'
	import {session} from '$lib/session'
	import {clay, SCHEMA, ITEM, type Schema, type Item} from '$lib/clayproto'

	let schema = $state<Schema | null>(null)
	let items = $state<{rkey: string; item: Item}[]>([])
	let loading = $state(true)
	let error = $state('')
	let deleting = $state(false)

	async function handleDelete() {
		const {rkey} = $page.params
		if (!rkey || !confirm('Delete this schema? This cannot be undone.')) return

		deleting = true
		try {
			await clay.deleteRecord(SCHEMA, rkey)
			goto('/schemas')
		} catch (err) {
			error = (err as Error).message
			deleting = false
		}
	}

	$effect(() => {
		if (!$session) {
			goto('/')
		}
	})

	onMount(async () => {
		if (!$session) return
		const {rkey} = $page.params
		if (!rkey) return

		try {
			schema = (await clay.getRecord(SCHEMA, rkey)) as Schema
			const allItems = await clay.listRecords(ITEM)
			items = allItems
				.filter((r) => (r.value as Item).schema === rkey)
				.map((r) => ({rkey: r.rkey, item: r.value as Item}))
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
			<p><a href="/schemas">schemas/</a></p>
			<nav>
				{#if loading}
					<p><em>loading...</em></p>
				{:else if error}
					<p><strong>! {error}</strong></p>
				{:else if schema}
					<div>
						{schema.name}
						<menu>
							<a href="/schemas/{$page.params.rkey}/new">+new</a>
							<a href="/schemas/{$page.params.rkey}/edit">edit</a>
							<button data-text onclick={handleDelete} disabled={deleting}
								>{#if deleting}<em>…</em>{:else}delete{/if}</button
							>
						</menu>
					</div>
					<nav>
						{#each items as { rkey: itemRkey, item } (itemRkey)}
							{@const preview = schema.fields
								.slice(0, 2)
								.map((f) => item.data[f.name])
								.filter(Boolean)
								.join(' ')}
							<p>
								<a href="/schemas/{$page.params.rkey}/items/{itemRkey}/edit"
									>{preview || itemRkey}</a
								>
							</p>
						{/each}
					</nav>
				{/if}
			</nav>
		</nav>
	</nav>
</nav>
