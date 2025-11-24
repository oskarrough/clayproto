<script lang="ts">
	import type {SchemaField} from '$lib/clayproto-sdk'

	let nsid = $state('')
	let title = $state('')
	let description = $state('')
	let fields = $state<SchemaField[]>([])

	function addField() {
		fields = [...fields, {name: '', type: 'string', required: false}]
	}

	function removeField(index: number) {
		fields = fields.filter((_, i) => i !== index)
	}

	function handleSubmit(e: SubmitEvent) {
		const form = e.target as HTMLFormElement
		const fieldsInput = form.querySelector('input[name="fields"]') as HTMLInputElement
		fieldsInput.value = JSON.stringify(fields)
	}
</script>

<h1>Create New Schema</h1>

<form method="post" onsubmit={handleSubmit}>
	<div>
		<label for="nsid">NSID</label>
		<input
			type="text"
			id="nsid"
			name="nsid"
			bind:value={nsid}
			placeholder="clay.music.track"
			required
		/>
		<small>Namespace identifier (e.g., clay.username.typename)</small>
	</div>

	<div>
		<label for="title">Title</label>
		<input type="text" id="title" name="title" bind:value={title} required />
	</div>

	<div>
		<label for="description">Description</label>
		<textarea id="description" name="description" bind:value={description}></textarea>
	</div>

	<h2>Fields</h2>

	{#each fields as field, i (i)}
		<div class="field-row">
			<input type="text" bind:value={field.name} placeholder="Field name" required />

			<select bind:value={field.type} required>
				<option value="string">String</option>
				<option value="number">Number</option>
				<option value="boolean">Boolean</option>
				<option value="array">Array</option>
			</select>

			{#if field.type === 'array'}
				<input type="text" bind:value={field.items} placeholder="Item type" />
			{/if}

			<label>
				<input type="checkbox" bind:checked={field.required} />
				Required
			</label>

			<button type="button" onclick={() => removeField(i)}>Remove</button>
		</div>
	{/each}

	<button type="button" onclick={addField}>Add Field</button>

	<input type="hidden" name="fields" value="" />

	<div>
		<button type="submit">Create Schema</button>
	</div>
</form>

<form method="get" action="/schemas">
	<button type="submit">Cancel</button>
</form>
