<script lang="ts">
	// Demo data - no auth needed
	const demoSchema = {
		$type: 'ar.0sk.clayproto.schema',
		name: 'books',
		fields: [
			{name: 'title', type: 'string', required: true},
			{name: 'author', type: 'string'},
			{name: 'rating', type: 'number'}
		],
		createdAt: '2025-01-15T10:30:00.000Z'
	}

	const demoItems = [
		{
			rkey: '3lbm7qzc2ks2k',
			data: {title: 'Dune', author: 'Frank Herbert', rating: 5}
		},
		{
			rkey: '3lbm7r4h5js2m',
			data: {title: 'Neuromancer', author: 'William Gibson', rating: 4}
		}
	]

	const demoDid = 'did:plc:z72i7hdynmk6r22z27h6tvur'
	const demoHandle = 'you.bsky.social'
	const demoSchemaRkey = '3lbm7qw5fks2j'

	// Exploration state
	let layer = $state<'surface' | 'structure' | 'protocol' | 'address'>('surface')
	let selectedItem = $state<number | null>(null)
	let selectedField = $state<number | null>(null)

	function cycleLayer() {
		const layers: (typeof layer)[] = ['surface', 'structure', 'protocol', 'address']
		const idx = layers.indexOf(layer)
		layer = layers[(idx + 1) % layers.length]
	}

	function buildItemRecord(item: (typeof demoItems)[0]) {
		return {
			$type: 'ar.0sk.clayproto.item',
			schema: demoSchemaRkey,
			data: item.data,
			createdAt: '2025-01-15T11:00:00.000Z'
		}
	}

	function formatJson(obj: unknown, indent = 0): string {
		const pad = '  '.repeat(indent)
		if (typeof obj !== 'object' || obj === null) {
			return typeof obj === 'string' ? `"${obj}"` : String(obj)
		}
		if (Array.isArray(obj)) {
			if (obj.length === 0) return '[]'
			const items = obj.map((v) => `${pad}  ${formatJson(v, indent + 1)}`).join(',\n')
			return `[\n${items}\n${pad}]`
		}
		const entries = Object.entries(obj)
		if (entries.length === 0) return '{}'
		const props = entries
			.map(([k, v]) => `${pad}  "${k}": ${formatJson(v, indent + 1)}`)
			.join(',\n')
		return `{\n${props}\n${pad}}`
	}
</script>

<main>
	<p><a href="/">clayproto/</a></p>
	<main>
		<p>explore/</p>

		<main>
			<section class="essay">
				<p class="prose">
					your Bluesky account comes with a personal data server. it holds your posts, your follows,
					your likes. but it can hold more.
				</p>

				<p class="prose">
					clayproto lets you define your own data structures and store them there. same
					infrastructure, any shape you want.
				</p>
			</section>

			<section class="demo">
				<header>
					<p class="prose">
						click the layer button to see underneath.
						<button class="layer-toggle" onclick={cycleLayer}>
							{layer}
						</button>
					</p>
				</header>

				{#if layer === 'surface'}
					<div class="tree">
						<p>@{demoHandle}/</p>
						<main>
							<p><span class="mono">└─</span> schemas/</p>
							<main>
								<p><span class="mono">└─</span> {demoSchema.name}/</p>
								<main>
									<p><span class="mono">├─</span> fields/</p>
									<main>
										{#each demoSchema.fields as field, i (field.name)}
											<p>
												<span class="mono">{i === demoSchema.fields.length - 1 ? '└─' : '├─'}</span>
												<button
													class="field-btn"
													class:selected={selectedField === i}
													onclick={() => (selectedField = selectedField === i ? null : i)}
												>
													{field.name}
												</button>
												<em>{field.type}{field.required ? ', required' : ''}</em>
											</p>
										{/each}
									</main>
									<p><span class="mono">└─</span> items/</p>
									<main>
										{#each demoItems as item, i (item.rkey)}
											<p>
												<span class="mono">{i === demoItems.length - 1 ? '└─' : '├─'}</span>
												<button
													class="item-btn"
													class:selected={selectedItem === i}
													onclick={() => (selectedItem = selectedItem === i ? null : i)}
												>
													{item.data.title}
												</button>
											</p>
										{/each}
									</main>
								</main>
							</main>
						</main>
					</div>

					{#if selectedItem !== null}
						<aside class="detail">
							<p class="detail-label">item data</p>
							<pre>{formatJson(demoItems[selectedItem].data)}</pre>
						</aside>
					{/if}

					{#if selectedField !== null}
						<aside class="detail">
							<p class="detail-label">field definition</p>
							<pre>{formatJson(demoSchema.fields[selectedField])}</pre>
						</aside>
					{/if}
				{:else if layer === 'structure'}
					<div class="structure">
						<p class="prose">
							a schema is an object with a name and fields. each field has a name and type.
						</p>

						<div class="code-panel">
							<p class="detail-label">ar.0sk.clayproto.schema</p>
							<pre>{formatJson(demoSchema)}</pre>
						</div>

						<p class="prose">
							an item references a schema by its record key. data is freeform but should match the
							schema.
						</p>

						<div class="code-panel">
							<p class="detail-label">ar.0sk.clayproto.item</p>
							<pre>{formatJson(buildItemRecord(demoItems[0]))}</pre>
						</div>
					</div>
				{:else if layer === 'protocol'}
					<div class="protocol">
						<p class="prose">
							under the hood: ATProto stores records in collections. each record has a URI.
						</p>

						<div class="code-panel">
							<p class="detail-label">collection</p>
							<pre>ar.0sk.clayproto.schema</pre>
							<pre>ar.0sk.clayproto.item</pre>
						</div>

						<p class="prose">the API is simple. four operations.</p>

						<div class="code-panel">
							<p class="detail-label">com.atproto.repo.*</p>
							<pre>listRecords(repo, collection)
getRecord(repo, collection, rkey)
putRecord(repo, collection, rkey, record)
deleteRecord(repo, collection, rkey)</pre>
						</div>

						<p class="prose">clayproto is a thin wrapper. you could call these directly.</p>
					</div>
				{:else if layer === 'address'}
					<div class="address">
						<p class="prose">
							every record has an address. a URI that works anywhere in the atmosphere.
						</p>

						<div class="code-panel">
							<p class="detail-label">schema URI</p>
							<pre>at://{demoDid}/ar.0sk.clayproto.schema/{demoSchemaRkey}</pre>
						</div>

						<div class="code-panel">
							<p class="detail-label">item URI</p>
							<pre>at://{demoDid}/ar.0sk.clayproto.item/{demoItems[0].rkey}</pre>
						</div>

						<p class="prose">
							anyone can read public records. your PDS is a server. your data has URLs.
						</p>

						<div class="code-panel">
							<p class="detail-label">HTTP equivalent</p>
							<pre>https://bsky.social/xrpc/com.atproto.repo.getRecord?repo={demoDid}&collection=ar.0sk.clayproto.schema&rkey={demoSchemaRkey}</pre>
						</div>

						<p class="prose">
							this is what "portable" means. not export/import. live, addressable, queryable.
						</p>
					</div>
				{/if}
			</section>

			<section class="essay">
				<p class="prose">
					the question is not where your data lives. it is whether you can reach it without asking
					permission.
				</p>
			</section>
		</main>
	</main>
</main>

<style>
	.essay {
		margin: 2rem 0;
	}

	.prose {
		background: transparent;
		max-width: 42ch;
		line-height: 1.4;
		margin: 0.75rem 0;
	}

	.demo {
		margin: 2rem 0;
		padding: 1rem;
		border-left: 2px solid #ccc;
	}

	.demo header {
		margin-bottom: 1rem;
	}

	.layer-toggle {
		font-family: var(--font-mono);
		background: #eee;
		border: none;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		margin-left: 0.5rem;
	}

	.layer-toggle:hover {
		background: #ddd;
	}

	.tree {
		margin: 1rem 0;
	}

	.field-btn,
	.item-btn {
		all: unset;
		cursor: pointer;
		padding: 0 0.25rem;
		margin: 0 0.25rem;
	}

	.field-btn:hover,
	.item-btn:hover {
		background: #ddd;
	}

	.field-btn.selected,
	.item-btn.selected {
		background: #cce;
	}

	.detail {
		margin: 1rem 0;
		padding: 0.5rem;
		background: #f8f8f8;
		border-left: 2px solid #99c;
	}

	.detail-label {
		background: transparent;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		color: #666;
		margin-bottom: 0.5rem;
	}

	.code-panel {
		margin: 1rem 0;
		padding: 0.5rem;
		background: #f4f4f4;
	}

	pre {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		line-height: 1.4;
		white-space: pre-wrap;
		word-break: break-all;
		margin: 0;
	}

	.structure,
	.protocol,
	.address {
		margin: 1rem 0;
	}
</style>
