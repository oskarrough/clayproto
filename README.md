# clayproto

Clayproto explores the good 'ol views (queries) plus data model (schema) but on top of AT Protocol.

Since we can store any data on atproto, and it's easy to authenticate using centralized Bluesky PDS,
clayproto explores how we can enable people to maintain collections of data on atproto by reusing a simple schema.

The idea is that you authenticate with clayproto, which gives you permission to CRUD two new records:
app.clayproto.schema
app.clayproto.item
Once you've created a app.clayproto.schema and defined its fields,
you can create as many items as you wish in this collection.

All data is stored in your user's personal repository on atproto.
