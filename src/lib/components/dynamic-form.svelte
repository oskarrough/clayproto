<script lang="ts">
	import type {SchemaField} from '$lib/clayproto-sdk'

	interface Props {
		fields: SchemaField[]
		values?: Record<string, unknown>
		errors?: Array<{field: string; message: string}>
		submitLabel?: string
	}

	let {fields, values = {}, errors = [], submitLabel = 'Submit'}: Props = $props()

	const uid = $props.id()

	let formData = $state<Record<string, unknown>>({})

	// Initialize form data with provided values once
	$effect(() => {
		const initial: Record<string, unknown> = {...values}

		// Apply defaults for fields
		for (const field of fields) {
			if (initial[field.name] === undefined) {
				if (field.type === 'boolean') {
					initial[field.name] = false
				} else if (field.type === 'array') {
					initial[field.name] = []
				} else {
					initial[field.name] = ''
				}
			}
		}

		formData = initial
	})

	function getFieldError(fieldName: string) {
		return errors.find((e) => e.field === fieldName)?.message
	}

	function addArrayItem(fieldName: string) {
		if (!Array.isArray(formData[fieldName])) {
			formData[fieldName] = []
		}
		formData[fieldName] = [...(formData[fieldName] as unknown[]), '']
	}

	function removeArrayItem(fieldName: string, index: number) {
		if (Array.isArray(formData[fieldName])) {
			const arr = formData[fieldName] as unknown[]
			formData[fieldName] = arr.filter((_, i) => i !== index)
		}
	}

	function updateArrayItem(fieldName: string, index: number, value: unknown) {
		if (Array.isArray(formData[fieldName])) {
			const arr = [...(formData[fieldName] as unknown[])]
			arr[index] = value
			formData[fieldName] = arr
		}
	}

	// Export formData so parent can access it
	export {formData}
</script>

{#each fields as field (field.name)}
	<div>
		<label for="{uid}-{field.name}">
			{field.name}
			{#if field.required}<abbr title="required">*</abbr>{/if}
		</label>

		{#if field.type === 'string'}
			<input
				type="text"
				id="{uid}-{field.name}"
				bind:value={formData[field.name]}
				required={field.required}
			/>
		{:else if field.type === 'number'}
			<input
				type="number"
				id="{uid}-{field.name}"
				bind:value={formData[field.name]}
				required={field.required}
			/>
		{:else if field.type === 'boolean'}
			<input
				type="checkbox"
				id="{uid}-{field.name}"
				checked={formData[field.name] as boolean}
				onchange={(e) => (formData[field.name] = (e.target as HTMLInputElement).checked)}
			/>
		{:else if field.type === 'array'}
			<div id="{uid}-{field.name}">
				{#each (formData[field.name] as unknown[]) || [] as item, i (i)}
					<div>
						<input
							type="text"
							value={item}
							oninput={(e) => updateArrayItem(field.name, i, (e.target as HTMLInputElement).value)}
						/>
						<button type="button" onclick={() => removeArrayItem(field.name, i)}>Remove</button>
					</div>
				{/each}
				<button type="button" onclick={() => addArrayItem(field.name)}>
					Add {field.name}
				</button>
			</div>
		{/if}

		{#if getFieldError(field.name)}
			<p>{getFieldError(field.name)}</p>
		{/if}
	</div>
{/each}

<div>
	<button type="submit">{submitLabel}</button>
</div>
