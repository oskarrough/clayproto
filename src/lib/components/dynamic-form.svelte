<script lang="ts">
	import type {SchemaField} from '$lib/clayproto'

	interface Props {
		fields: SchemaField[]
		values?: Record<string, unknown>
		errors?: Array<{field: string; message: string}>
		submitLabel?: string
	}

	let {fields, values = {}, errors = [], submitLabel = 'Submit'}: Props = $props()

	const uid = $props.id()
	const defaults: Record<string, unknown> = {boolean: false, array: [], string: '', number: ''}

	let formData = $state<Record<string, unknown>>({})

	$effect(() => {
		formData = Object.fromEntries(
			fields.map((f) => [f.name, values[f.name] ?? defaults[f.type] ?? ''])
		)
	})

	const getFieldError = (name: string) => errors.find((e) => e.field === name)?.message

	function updateArray(name: string, fn: (arr: unknown[]) => unknown[]) {
		const arr = Array.isArray(formData[name]) ? (formData[name] as unknown[]) : []
		formData[name] = fn(arr)
	}

	export {formData}
</script>

{#each fields as field, i (field.name)}
	<p>
		<span class="mono">{i === fields.length - 1 && !submitLabel ? '└─' : '├─'}</span>
		{field.name}{#if field.required}*{/if}
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
			<em>[]</em>
		{/if}
		{#if getFieldError(field.name)}
			<strong>! {getFieldError(field.name)}</strong>
		{/if}
	</p>
	{#if field.type === 'array'}
		<main>
			{#each (formData[field.name] as unknown[]) || [] as item, j (j)}
				<p>
					├─ <input
						type="text"
						value={item}
						oninput={(e) =>
							updateArray(field.name, (arr) => arr.with(j, (e.target as HTMLInputElement).value))}
					/>
					<button
						data-text
						type="button"
						onclick={() => updateArray(field.name, (arr) => arr.toSpliced(j, 1))}>×</button
					>
				</p>
			{/each}
			<p>
				└─ <button
					data-text
					type="button"
					onclick={() => updateArray(field.name, (arr) => [...arr, ''])}>+</button
				>
			</p>
		</main>
	{/if}
{/each}

{#if submitLabel}
	<p><span class="mono">└─</span> <button type="submit">{submitLabel}</button></p>
{/if}
