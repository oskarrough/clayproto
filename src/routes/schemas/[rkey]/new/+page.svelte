<script lang="ts">
	import {onMount} from 'svelte'
	import {goto} from '$app/navigation'
	import {session} from '$lib/session'
	import {clayprotoSDK, type SchemaDefinition} from '$lib/clayproto-sdk'
	import DynamicForm from '$lib/components/dynamic-form.svelte'

	const {params} = $props()

	let schema = $state<SchemaDefinition | null>(null)
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
			schema = await clayprotoSDK.getSchema(rkey)
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
			await clayprotoSDK.createItem(schemaRkey, dynamicForm.formData)
			goto(`/schemas/${schemaRkey}`)
		} catch (err) {
			error = (err as Error).message
			submitting = false
		}
	}
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
				{:else if error && !schema}
					<p><strong>! {error}</strong></p>
				{:else if schema}
					<p>└─ <a href="/schemas/{params.rkey}">{schema.name}/</a></p>
					<main>
						<p>└─ items/</p>
						<main>
							<p>└─ + new item/</p>
							<main>
								{#if error}
									<p><strong>! {error}</strong></p>
								{/if}
								<form onsubmit={handleSubmit}>
									<DynamicForm
										bind:this={dynamicForm}
										fields={schema.fields}
										submitLabel={submitting ? 'creating...' : 'create'}
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
