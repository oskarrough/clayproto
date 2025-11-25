# Clayproto improvement plan

## 1. View other people's data
Add routes for browsing anyone's clayproto data: `/@handle.bsky.social/schemas/`. The `clay.listRecords` already supports `otherDid` — just needs UI.

## 2. Extract TreeNav component
Breadcrumb tree structure repeated in every page. Create `<TreeNav>` using Svelte 5 snippets — `{@render children?.()}`.

## 3. Schema sharing (fork)
"Fork schema" action — see someone's schema, copy it to your PDS. Core ATProto interop vision.

## 4. Fix nested main tags
Replace nested `<main>` with `<div class="indent">` or similar. Current structure confuses screen readers.

## 5. Loading state helper
Each page has identical `let loading = $state(true)` pattern. Create `createResource` helper or use Svelte 5 async components.

## 6. More field types
Current: string, number, boolean, array. Keep JS-native types. Maybe add: datetime (string, ISO8601), blob (for images via ATProto).

## 7. Export/API visibility
Show users how to query their data via ATProto API. "View raw" link or code snippet reinforces data ownership.
