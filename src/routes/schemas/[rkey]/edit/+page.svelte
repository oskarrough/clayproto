<script lang="ts">
	import {onMount} from 'svelte'
	import {goto} from '$app/navigation'
	import {page} from '$app/stores'
	import {session} from '$lib/session'
	import {clayprotoSDK, type SchemaField} from '$lib/clayproto-sdk'

	const uid = $props.id()

	let name = $state('')
	let description = $state('')
	let fields = $state<SchemaField[]>([])
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
			const schema = await clayprotoSDK.getSchema(rkey)
			name = schema.name
			description = schema.description || ''
			fields = schema.fields
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
			await clayprotoSDK.updateSchema(rkey, {
				name,
				description: description || undefined,
				fields
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
			<p>└─ <a href="/schemas">schemas/</a></p>
			<main>
				{#if loading}
					<p><em>loading...</em></p>
				{:else}
					<p>└─ <a href="/schemas/{$page.params.rkey}">{name || '...'}/</a></p>
					<main>
						<p>└─ edit/</p>
						<main>
							{#if error}
								<p><strong>! {error}</strong></p>
							{/if}
							<form onsubmit={handleSubmit}>
								<p>
									├─ name: <input
										type="text"
										id="{uid}-name"
										bind:value={name}
										placeholder="track"
										disabled={submitting}
										required
									/>
								</p>
								<p>
									├─ description: <textarea
										id="{uid}-description"
										bind:value={description}
										disabled={submitting}
									></textarea>
								</p>
								<p>├─ fields/</p>
								<main>
									{#each fields as field, i (i)}
										<p>
											├─ <input
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
												{#if field.type === 'array'}
													<input
														type="text"
														bind:value={field.items}
														placeholder="item type"
														disabled={submitting}
													/>
												{/if}
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
										└─ <button data-text type="button" onclick={addField} disabled={submitting}
											>+ add field</button
										>
									</p>
								</main>
								<p>
									└─ <button type="submit" disabled={submitting}>
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
