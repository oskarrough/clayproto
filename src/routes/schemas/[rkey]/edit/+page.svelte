<script lang="ts">
	import {onMount} from 'svelte'
	import {goto} from '$app/navigation'
	import {page} from '$app/stores'
	import {session} from '$lib/session'
	import {clay, SCHEMA, type Schema, type SchemaField} from '$lib/clayproto'

	const uid = $props.id()

	let name = $state('')
	let fields = $state<SchemaField[]>([])
	let createdAt = $state('')
	let loading = $state(true)
	let submitting = $state(false)
	let error = $state('')

	$effect(() => {
		if (!$session) {
			goto('/')
		}
	})

	onMount(async () => {
		const {rkey} = $page.params
		if (!$session || !rkey) return

		try {
			const schema = (await clay.getRecord(SCHEMA, rkey)) as Schema
			name = schema.name
			fields = schema.fields
			createdAt = schema.createdAt
		} catch (err) {
			error = (err as Error).message
		} finally {
			loading = false
		}
	})

	function addField() {
		fields = [...fields, {name: '', type: 'string', required: false}]
	}

	function removeField(index: number) {
		fields = fields.filter((_, i) => i !== index)
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault()
		const {rkey} = $page.params
		if (!rkey || !name) return

		error = ''
		submitting = true

		try {
			await clay.putRecord(SCHEMA, rkey, {
				$type: SCHEMA,
				name,
				fields,
				createdAt
			})
			goto(`/schemas/${rkey}`)
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
				{:else}
					<p><a href="/schemas/{$page.params.rkey}">{name || '...'}/</a></p>
					<nav>
						{#if error}
							<p><strong>! {error}</strong></p>
						{/if}
						<form onsubmit={handleSubmit}>
							<p>
								name:
								<input
									type="text"
									id="{uid}-name"
									bind:value={name}
									placeholder="track"
									disabled={submitting}
									required
								/>
							</p>
							<p>fields/</p>
							<nav>
								{#each fields as field, i (i)}
									<p>
										<input
											type="text"
											bind:value={field.name}
											placeholder="name"
											disabled={submitting}
											required
										/>
										<em>
											<select bind:value={field.type} disabled={submitting} required>
												<option value="string">string</option>
												<option value="number">number</option>
												<option value="boolean">boolean</option>
												<option value="array">array</option>
											</select>
										</em>
										<label
											><input type="checkbox" bind:checked={field.required} disabled={submitting} /> *</label
										>
										<button
											data-text
											type="button"
											onclick={() => removeField(i)}
											disabled={submitting}>x</button
										>
									</p>
								{/each}
								<p>
									<button data-text type="button" onclick={addField} disabled={submitting}
										>+ add field</button
									>
								</p>
							</nav>
							<p>
								<button type="submit" disabled={submitting}>
									{#if submitting}<em>saving...</em>{:else}save{/if}
								</button>
							</p>
						</form>
					</nav>
				{/if}
			</nav>
		</nav>
	</nav>
</nav>
