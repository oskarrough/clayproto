<script lang="ts">
	import {onMount} from 'svelte'
	import {goto} from '$app/navigation'
	import {session} from '$lib/session'
	import {clay, SCHEMA, ITEM, type Schema, type Item} from '$lib/clayproto'
	import DynamicForm from '$lib/components/dynamic-form.svelte'

	const {params} = $props()

	let schema = $state<Schema | null>(null)
	let item = $state<Item | null>(null)
	let loading = $state(true)
	let submitting = $state(false)
	let deleting = $state(false)
	let error = $state('')

	let dynamicForm = $state<{formData: Record<string, unknown>} | undefined>()

	$effect(() => {
		if (!$session) {
			goto('/')
		}
	})

	onMount(async () => {
		if (!$session) return

		const {rkey, itemRkey} = params
		if (!rkey || !itemRkey) return

		try {
			schema = (await clay.getRecord(SCHEMA, rkey)) as Schema
			item = (await clay.getRecord(ITEM, itemRkey)) as Item
		} catch (err) {
			error = (err as Error).message
		} finally {
			loading = false
		}
	})

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault()
		const {rkey: schemaRkey, itemRkey} = params
		if (!schemaRkey || !itemRkey || !schema || !item || !dynamicForm?.formData) return

		error = ''
		submitting = true

		try {
			await clay.putRecord(ITEM, itemRkey, {
				$type: ITEM,
				schema: schemaRkey,
				data: dynamicForm.formData,
				createdAt: item.createdAt
			})
			goto(`/schemas/${schemaRkey}`)
		} catch (err) {
			error = (err as Error).message
			submitting = false
		}
	}

	async function handleDelete() {
		const {rkey, itemRkey} = params
		if (!rkey || !itemRkey || !confirm('Delete this item? This cannot be undone.')) return

		deleting = true
		try {
			await clay.deleteRecord(ITEM, itemRkey)
			goto(`/schemas/${rkey}`)
		} catch (err) {
			error = (err as Error).message
			deleting = false
		}
	}
</script>

<main>
	<p><a href="/">clayproto/</a></p>
	<main>
		<p>@{$session?.handle}/</p>
		<main>
			<p><span mono>└─</span> <a href="/schemas">schemas/</a></p>
			<main>
				{#if loading}
					<p><em>loading...</em></p>
				{:else if error && !schema}
					<p><strong>! {error}</strong></p>
				{:else if schema && item}
					<p><span mono>└─</span> <a href="/schemas/{params.rkey}">{schema.name}/</a></p>
					<main>
						<p><span mono>└─</span> items/</p>
						<main>
							<p>
								<span mono>└─</span>
								{schema.fields
									.slice(0, 2)
									.map((f) => item?.data[f.name])
									.filter(Boolean)
									.join(' ') || params.itemRkey}/
								<button data-text onclick={handleDelete} disabled={deleting}
									>{#if deleting}<em>deleting...</em>{:else}delete{/if}</button
								>
							</p>
							<main>
								{#if error}
									<p><strong>! {error}</strong></p>
								{/if}
								<form onsubmit={handleSubmit}>
									<DynamicForm
										bind:this={dynamicForm}
										fields={schema.fields}
										values={item.data}
										submitLabel={submitting ? 'saving...' : 'save'}
									/>
								</form>
							</main>
						</main>
					</main>
				{/if}
			</main>
		</main>
	</main>
</main>
