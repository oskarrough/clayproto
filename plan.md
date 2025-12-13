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

## 8. Explore page

Discover schemas others have created across the network. Enables serendipitous discovery and shows what's possible with Clayproto.

## 9. Provenance tracking

Add `via` field to items — "this item was based on X's item". Enables social graph, notifications when someone forks your stuff.

## 10. `@0sk/clayproto-client` SDK

NPM package for programmatic access. Lower barrier to building on Clayproto data, like Semble's `@cosmik.network/semble-pds-client`.

## 11. Fork/clone schema

One-click "use this schema" from explore or viewing others' schemas. Copies schema definition to your PDS. Core network effect driver.
