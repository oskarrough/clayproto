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
	const defaults: Record<string, unknown> = {boolean: false, array: [], string: '', number: ''}

	let formData = $derived(
		Object.fromEntries(fields.map((f) => [f.name, values[f.name] ?? defaults[f.type] ?? '']))
	)

	const getFieldError = (name: string) => errors.find((e) => e.field === name)?.message

	function updateArray(name: string, fn: (arr: unknown[]) => unknown[]) {
		const arr = Array.isArray(formData[name]) ? (formData[name] as unknown[]) : []
		formData[name] = fn(arr)
	}

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
							oninput={(e) =>
								updateArray(field.name, (arr) => arr.with(i, (e.target as HTMLInputElement).value))}
						/>
						<button
							type="button"
							onclick={() => updateArray(field.name, (arr) => arr.toSpliced(i, 1))}>Remove</button
						>
					</div>
				{/each}
				<button type="button" onclick={() => updateArray(field.name, (arr) => [...arr, ''])}>
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
