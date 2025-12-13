# clayproto

user-defined schemas on ATProto. your data, your structure, your server.

> this is just a prototype

## the problem

ATProto gives you a personal data server. in theory, your data is portable and yours. in practice, you only get to store what apps define — Bluesky stores posts, likes, follows. what about everything else? your reading list, recipes, project notes, workout logs?

you could use Notion or Airtable, but then we are back to someone else's server.

## the idea

Clayproto lets you define schemas and store structured data in your PDS. same infrastructure that holds your Bluesky posts, but for anything you want to track.

portable, queryable, yours.

## how it works

```
/@handle.bsky.social/schemas/
└── books/
    ├── fields/
    │   ├── title        string, required
    │   ├── author       string
    │   └── rating       number
    └── items/
        ├── dune
        └── neuromancer
```

two record types in your PDS:

```
ar.0sk.clayproto.schema   — field definitions
ar.0sk.clayproto.item     — data referencing a schema
```

auth via any ATProto account. query your data directly via the ATProto API — clayproto is just one interface.

## status

working: schemas and items (CRUD via UI or API)

planned: views (filters, sorting, grouping), schema forking
