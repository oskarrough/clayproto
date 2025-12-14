<script lang="ts">
	import {onMount} from 'svelte'
	import {goto} from '$app/navigation'
	import {session} from '$lib/session'
	import {clay, tid, SCHEMA, ITEM, type Schema} from '$lib/clayproto'
	import DynamicForm from '$lib/components/dynamic-form.svelte'

	const {params} = $props()

	let schema = $state<Schema | null>(null)
	let loading = $state(true)
	let submitting = $state(false)
	let error = $state('')

	let dynamicForm = $state<{formData: Record<string, unknown>} | undefined>()

	$effect(() => {
		if (!$session) {
			goto('/')
		}
	})

	onMount(async () => {
		if (!$session) return

		const {rkey} = params
		if (!rkey) return

		try {
			schema = (await clay.getRecord(SCHEMA, rkey)) as Schema
		} catch (err) {
			error = (err as Error).message
		} finally {
			loading = false
		}
	})

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault()
		if (!schema || !dynamicForm?.formData) return

		const {rkey: schemaRkey} = params
		error = ''
		submitting = true

		try {
			await clay.putRecord(ITEM, tid(), {
				$type: ITEM,
				schema: schemaRkey,
				data: dynamicForm.formData,
				createdAt: new Date().toISOString()
			})
			goto(`/schemas/${schemaRkey}`)
		} catch (err) {
			error = (err as Error).message
			submitting = false
		}
	}
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
				{:else if error && !schema}
					<p><strong>! {error}</strong></p>
				{:else if schema}
					<p><a href="/schemas/{params.rkey}">{schema.name}/</a></p>
					<nav>
						<p>+</p>
						<nav>
							{#if error}
								<p><strong>! {error}</strong></p>
							{/if}
							<form onsubmit={handleSubmit}>
								<DynamicForm
									bind:this={dynamicForm}
									fields={schema.fields}
									submitLabel={submitting ? 'saving...' : 'save'}
								/>
							</form>
						</nav>
					</nav>
				{/if}
			</nav>
		</nav>
	</nav>
</nav>
