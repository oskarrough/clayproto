# clayproto

Warnings. This is mostly me learning how you can build on AT Protocol.

## The problem

ATProto lets you store arbitrary records in your personal repository. Lexicons formalize these types. But lexicons require deploying infrastructure—AppViews, indexers and so on. 

## What this does

Clayproto is a web interface for defining schemas and writing records to your PDS. 

1. You own an AT Protocol account, for example Bluesky.
2. You describe your data model through forms on the clayproto website 
3. You create records either through clayproto or directly with the ATProto API. They live at `app.clayproto.schema` and `app.clayproto.item` in your repository, not ours.

Think WordPress ACF or Sanity's content studio, but the substrate is your personal datastore instead of their MySQL instance. I'm not convinced that this idea is really useful,
but hopefully this prototype can answer it later.

## Trade-offs

You get auth, structured storage, zero infrastructure (that you control), portable data.  
You don't get: queries, reactivity, shared schemas, automatic app interop. The query layer is someone else's problem. Possibly yours later, if your movie collection gets unwieldy. But the writes are free and the data is yours.
