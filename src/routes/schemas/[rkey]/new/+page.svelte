<script lang="ts">
	import {onMount} from 'svelte'
	import {goto} from '$app/navigation'
	import {page} from '$app/stores'
	import {session} from '$lib/session'
	import {clayprotoSDK, type SchemaDefinition} from '$lib/clayproto-sdk'
	import DynamicForm from '$lib/components/dynamic-form.svelte'

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

		const rkey = $page.params.rkey
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

		error = ''
		submitting = true

		try {
			await clayprotoSDK.createItem(schema.nsid, dynamicForm.formData)
			goto(`/schemas/${$page.params.rkey}`)
		} catch (err) {
			error = (err as Error).message
			submitting = false
		}
	}
</script>

{#if loading}
	<p>Loading...</p>
{:else if error && !schema}
	<p style="color: red">{error}</p>
{:else if schema}
	<h1>New {schema.title}</h1>

	{#if error}
		<p style="color: red">{error}</p>
	{/if}

	<form onsubmit={handleSubmit}>
		<DynamicForm
			bind:this={dynamicForm}
			fields={schema.fields}
			submitLabel={submitting ? 'Creating...' : 'Create'}
		/>
	</form>

	<p><a href="/schemas/{$page.params.rkey}">← Cancel</a></p>
{/if}
