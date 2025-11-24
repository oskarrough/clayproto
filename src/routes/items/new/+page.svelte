<script lang="ts">
	import DynamicForm from '$lib/components/dynamic-form.svelte'
	import {enhance} from '$app/forms'
	import type {PageData, ActionData} from './$types'

	let {data, form}: {data: PageData; form: ActionData} = $props()

	let dynamicForm: DynamicForm
</script>

<h1>Create {data.schema.schema.title}</h1>

<form method="post" use:enhance>
	<DynamicForm
		bind:this={dynamicForm}
		fields={data.schema.schema.fields}
		errors={form?.errors || []}
		submitLabel="Create"
	/>

	<input
		type="hidden"
		name="data"
		value={dynamicForm ? JSON.stringify(dynamicForm.formData) : '{}'}
	/>
</form>

<p><a href="/schemas">Back to schemas</a></p>
