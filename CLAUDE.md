You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## Workflow Preferences

- Use `jj` for version control (not git)
- Use `bun` for package management (not npm)
- Remember to lint
- Don't be verbose - keep explanations concise
- Don't ask "what should I do next?" - be proactive and surface info from plan.md
- In jj, changes are automatically tracked - no need to explicitly commit
- Use `jj new -m "message"` to create new changes for each logical task
- Update CLAUDE.md liberally as you learn our workflow patterns
- Surface todos from plan.md and work through them systematically
- use bun, not npm
