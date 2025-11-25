<script lang="ts">
	import {onMount} from 'svelte'
	import {goto} from '$app/navigation'
	import {session} from '$lib/session'
	import {clayprotoSDK, type SchemaField} from '$lib/clayproto-sdk'
	import type {Snapshot} from './$types'

	const uid = $props.id()

	let name = $state('')
	let fields = $state<SchemaField[]>([])
	let submitting = $state(false)
	let error = $state('')

	// Preserve form data across navigation
	interface FormSnapshot {
		name: string
		fields: SchemaField[]
	}

	export const snapshot: Snapshot<FormSnapshot> = {
		capture: () => ({name, fields}),
		restore: (value) => {
			name = value.name
			fields = value.fields
		}
	}

	onMount(() => {
		if (!$session) goto('/')
	})

	function addField() {
		fields = [...fields, {name: '', type: 'string', required: false}]
	}

	function removeField(index: number) {
		fields = fields.filter((_, i) => i !== index)
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault()
		if (!name) return

		error = ''
		submitting = true

		try {
			await clayprotoSDK.createSchema({
				name,
				fields
			})
			goto('/schemas')
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
			<p><span mono>└─</span> <a href="/schemas">schemas/</a></p>
			<main>
				<!-- <p><span mono>└─</span>+creating new schema/</p> -->
				<main>
					{#if error}
						<p><strong>! {error}</strong></p>
					{/if}
					<form onsubmit={handleSubmit}>
						<p>
							<span mono>├─</span> name:
							<input
								type="text"
								id="{uid}-name"
								bind:value={name}
								placeholder="track"
								disabled={submitting}
								required
							/>
						</p>
						<p><span mono>├─</span> fields/</p>
						<main>
							{#each fields as field, i (i)}
								<p>
									<span mono>├─</span>
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
										><input type="checkbox" bind:checked={field.required} disabled={submitting} /> *</label
									>
									<button
										data-text
										type="button"
										onclick={() => removeField(i)}
										disabled={submitting}>×</button
									>
								</p>
							{/each}
							<p>
								<span mono>└─</span>
								<button data-text type="button" onclick={addField} disabled={submitting}>+</button>
							</p>
						</main>
						<p>
							<span mono>└─</span>
							<button type="submit" disabled={submitting}>
								{#if submitting}<em>creating...</em>{:else}save{/if}
							</button>
						</p>
					</form>
				</main>
			</main>
		</main>
	</main>
</main>
