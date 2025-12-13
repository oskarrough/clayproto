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

<main>
	<p><a href="/">clayproto/</a></p>
	<main>
		<p>@{$session?.handle}/</p>
		<main>
			<p><span class="mono">└─</span> <a href="/schemas">schemas/</a></p>
			<main>
				{#if loading}
					<p><em>loading...</em></p>
				{:else}
					<p>
						<span class="mono">└─</span> <a href="/schemas/{$page.params.rkey}">{name || '...'}/</a>
					</p>
					<main>
						<!-- <p><span class="mono">└─</span> edit/</p> -->
						<main>
							{#if error}
								<p><strong>! {error}</strong></p>
							{/if}
							<form onsubmit={handleSubmit}>
								<p>
									<span class="mono">├─</span> name:
									<input
										type="text"
										id="{uid}-name"
										bind:value={name}
										placeholder="track"
										disabled={submitting}
										required
									/>
								</p>
								<p><span class="mono">├─</span> fields/</p>
								<main>
									{#each fields as field, i (i)}
										<p>
											<span class="mono">├─</span>
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
												><input
													type="checkbox"
													bind:checked={field.required}
													disabled={submitting}
												/> *</label
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
										<span class="mono">└─</span>
										<button data-text type="button" onclick={addField} disabled={submitting}
											>+ add field</button
										>
									</p>
								</main>
								<p>
									<span class="mono">└─</span>
									<button type="submit" disabled={submitting}>
										{#if submitting}<em>saving...</em>{:else}save{/if}
									</button>
								</p>
							</form>
						</main>
					</main>
				{/if}
			</main>
		</main>
	</main>
</main>
