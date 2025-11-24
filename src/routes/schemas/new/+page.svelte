<script lang="ts">
	import {onMount} from 'svelte'
	import {goto} from '$app/navigation'
	import {session} from '$lib/session'
	import {clayprotoSDK, type SchemaField} from '$lib/clayproto-sdk'

	let nsid = $state('')
	let title = $state('')
	let description = $state('')
	let fields = $state<SchemaField[]>([])
	let submitting = $state(false)
	let error = $state('')

	onMount(() => {
		if (!$session) {
			goto('/')
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
		if (!nsid || !title) return

		error = ''
		submitting = true

		try {
			await clayprotoSDK.createSchema({
				nsid,
				title,
				description: description || undefined,
				fields
			})
			goto('/schemas')
		} catch (err) {
			error = (err as Error).message
			submitting = false
		}
	}
</script>

<h1>Create New Schema</h1>

{#if error}
	<p style="color: red">{error}</p>
{/if}

<form onsubmit={handleSubmit}>
	<div>
		<label for="nsid">NSID</label>
		<input
			type="text"
			id="nsid"
			bind:value={nsid}
			placeholder="clay.music.track"
			disabled={submitting}
			required
		/>
		<small>Namespace identifier (e.g., clay.username.typename)</small>
	</div>

	<div>
		<label for="title">Title</label>
		<input type="text" id="title" bind:value={title} disabled={submitting} required />
	</div>

	<div>
		<label for="description">Description</label>
		<textarea id="description" bind:value={description} disabled={submitting}></textarea>
	</div>

	<h2>Fields</h2>

	{#each fields as field, i (i)}
		<div class="field-row">
			<input
				type="text"
				bind:value={field.name}
				placeholder="Field name"
				disabled={submitting}
				required
			/>

			<select bind:value={field.type} disabled={submitting} required>
				<option value="string">String</option>
				<option value="number">Number</option>
				<option value="boolean">Boolean</option>
				<option value="array">Array</option>
			</select>

			{#if field.type === 'array'}
				<input type="text" bind:value={field.items} placeholder="Item type" disabled={submitting} />
			{/if}

			<label>
				<input type="checkbox" bind:checked={field.required} disabled={submitting} />
				Required
			</label>

			<button type="button" onclick={() => removeField(i)} disabled={submitting}>Remove</button>
		</div>
	{/each}

	<button type="button" onclick={addField} disabled={submitting}>Add Field</button>

	<div>
		<button type="submit" disabled={submitting}>
			{submitting ? 'Creating...' : 'Create Schema'}
		</button>
	</div>
</form>

<p><a href="/schemas">← Cancel</a></p>
