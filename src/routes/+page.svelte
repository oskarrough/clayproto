<script lang="ts">
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()
	let handle = $state('')
</script>

<h1>clayproto</h1>
<p>Malleable, manpage-style, cool, usable, FREE software</p>

{#if data.did}
	<p>Logged in as: {data.did}</p>
	<form method="get" action="/auth/logout">
		<button type="submit">Logout</button>
	</form>
{:else}
	<form method="get" action="/auth/login">
		<input
			type="text"
			name="handle"
			bind:value={handle}
			placeholder="your-handle.bsky.social"
			required
		/>
		<button type="submit">Sign in</button>
	</form>
{/if}
