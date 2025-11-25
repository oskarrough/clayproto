## LLM instructions for working on clayproto

## General workflow

- Don't ask "what should I do next?" - be proactive and surface next step or question from plan.md
- Remember to lint using `make lint`
- Update CLAUDE.md liberally as you learn our workflow patterns
- Use `jj` (jujutsu) for version control (jj new, jj describe, check jj help)
- Use `bun` and `bunx` for package management (not npm)
- Don't be verbose - keep explanations concise
- Avoid unnecessary wrapper functions - export classes directly

## UI principles

Everything is a node (Unix philosophy: everything is a file).

- Navigation = `cd`, each page shows `ls` of current directory with ancestors expanded
- Directories end with `/`
- `+ new` is like `touch` or `mkdir`
- The handle is the root of their PDS - that's literally what it is

Tree structure:

```
/clayproto
├── @handle.bsky.social
│   ├── schemas/
│   │   └── my-schema/
│   │       ├── fields/
│   │       │   └── title <em>string, required</em>
│   │       └── items/
│   └── logout
└── login (when signed out)
```

Text emphasis:

- `<em>` - secondary info: types, metadata, empty states, loading
- `<strong>` - errors only
- Everything else is plain text

## Svelte MCP server

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You can use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.
