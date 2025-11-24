# clayproto: Building Applications Within Applications

## CONCEPT

Malleable, manpage-style, cool, usable, FREE software. No selling. Hacker ethos.

An AppView that lets users mold software to their needs. Create custom data models (books, games, recipes, whatever) and track them. Data lives in their PDS repo. One app, infinite apps.

Example: User wants to track "music tracks" with url, title, and tags.

How it works (ATProto terms):

- AppView that aggregates data from user repos
- Schema definitions stored as records in collection: app.clayproto.schema
- User data stored as records in collection: app.clayproto.item
- Each record has $type field identifying which schema it follows
- Everything lives in user's data repo on their PDS

## WEBAPP

Minimal, malleable POC. Single routes for each purpose:

1. Let users create schemas (define what they want to track)
2. Let users create/view/edit items using those schemas
3. (Future) Aggregate data from other users via AppView

## RESOURCES

- https://atproto.com/guides/applications
- https://blog.cloudflare.com/serverless-atproto/
- https://kevinhoffman.blog/posts/decentralized_atproto/
- https://atproto.com/guides/lexicon

## TODO

1. ✅ Read all resource URLs and extract relevant notes to research.md
2. ✅ Set up OAuth authentication flow (connect to user's PDS)
3. ✅ Create SDK class to wrap ATProto API calls
4. ✅ Define Lexicon schemas for app.clayproto.schema and app.clayproto.item
5. ✅ Build schema builder UI (form to create schema definitions)
6. ✅ Implement schema CRUD operations (create, read, update, delete all wired)
7. ✅ Build dynamic form generator (reads schema, generates input form)
8. ✅ Implement item CRUD operations (SDK done, routes wired)
9. ✅ Build list/view UI for items (/schemas/[rkey] shows items)
10. ✅ Refactor for elegance (field builder factory, cache helper, reduced LOC)
11. ✅ Item edit/delete UI (edit page doubles as detail view)
12. Test full flow end-to-end
13. Basic styling

## OPEN QUESTIONS

See research.md for detailed answers. Summary:

- Custom Lexicons: Hybrid approach - fixed wrappers with schema definitions as records
- Namespace user schemas: clay.username.typename with collision detection
- Discovery: AppView maintains searchable index
- Dynamic schemas: Yes, via client-side validation of wrapper records

## TECHNICAL NOTES

- Stack: SvelteKit
- Build class-based SDK for sanity (wrap ATProto interactions)
- Using jj (jujutsu) for version control (jj new, jj describe, check jj help)
- Remember to lint
- Name: clayproto (clay = moldable, shapeable)
