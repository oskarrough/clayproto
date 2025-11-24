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
	let deleting = $state(false)

	async function handleDelete() {
		const {rkey} = $page.params
		if (!rkey || !confirm('Delete this schema? This cannot be undone.')) return

		deleting = true
		try {
			await clayprotoSDK.deleteSchema(rkey)
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
			schema = await clayprotoSDK.getSchema(rkey)
			items = await clayprotoSDK.listItemsBySchema(schema.name)
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
			<p>└─ <a href="/schemas">schemas/</a></p>
			<main>
				{#if loading}
					<p><em>loading...</em></p>
				{:else if error}
					<p><strong>! {error}</strong></p>
				{:else if schema}
					<p>
						└─ {schema.name}/ <a href="/schemas/{$page.params.rkey}/edit">edit</a>
						<button data-text onclick={handleDelete} disabled={deleting}
							>{#if deleting}<em>deleting...</em>{:else}delete{/if}</button
						>
						{#if schema.description}<em>{schema.description}</em>{/if}
					</p>
					<main>
						<p>
							├─ fields/{#if schema.fields.length > 0}
								({schema.fields.length}){:else}
								<em>(empty)</em>{/if}
						</p>
						{#if schema.fields.length > 0}
							<main>
								{#each schema.fields as field, i (field.name)}
									<p>
										{i === schema.fields.length - 1 ? '└─' : '├─'}
										<strong>{field.name}</strong>
										<em
											>{field.type}{field.items ? `<${field.items}>` : ''}{field.required
												? ' *'
												: ''}</em
										>
									</p>
								{/each}
							</main>
						{/if}
						<p>
							└─ items/{#if items.length > 0}
								({items.length}){:else}
								<em>(empty)</em>{/if}
						</p>
						<main>
							{#each items as { rkey: itemRkey, item } (itemRkey)}
								{@const preview = schema.fields
									.slice(0, 2)
									.map((f) => item.data[f.name])
									.filter(Boolean)
									.join(' ')}
								<p>
									├─ <a href="/schemas/{$page.params.rkey}/items/{itemRkey}/edit"
										>{preview || itemRkey}</a
									>
								</p>
							{/each}
							<p>└─ <a href="/schemas/{$page.params.rkey}/new">+ new item</a></p>
						</main>
					</main>
				{/if}
			</main>
		</main>
	</main>
</main>
