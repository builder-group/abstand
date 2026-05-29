# DB

SQLite database module. `schema.sql` is the source of truth. Migrations are applied automatically on startup via sqlx.

## Schema Migrations

Edit `schema.sql`, then run:

```sh
pnpm db:migrate <name>
```

Pass one descriptive name. The wrapper normalizes it for the migration filename.

Useful checks:

```sh
pnpm db:check
pnpm db:inspect
```

### Why Wrap Atlas?

Atlas Community Edition does not diff SQLite triggers. `pnpm db:migrate` wraps Atlas so Atlas still manages tables, columns, indexes, foreign keys, and constraints, while `scripts/db-schema.mjs` compares triggers itself.

The wrapper builds temporary SQLite databases from the current migrations and `schema.sql`. Atlas diffs the trigger-free schema, then the wrapper appends trigger changes to the generated migration and refreshes the Atlas migration hash.

### Supported Schema Objects

Currently handled:

- Atlas-managed: tables, columns, indexes, foreign keys, and constraints
- Wrapper-managed: triggers

Other schema objects fail intentionally until the wrapper has comparison support for them.

## Design Decisions

### Why does `intention_block` use `intention_id` as its primary key?

`intention` is the thing the user creates. `intention_block` is its block-specific configuration: a 1:1 extension row, not an independent entity.

`intention.behavior_type` is the discriminator. To load a block intention:

```sql
SELECT i.*, ib.*
FROM intention AS i
JOIN intention_block AS ib ON ib.intention_id = i.id
WHERE i.behavior_type = 'block';
```

Identity belongs to the intention, not the behavior. When `Break` is added it follows the same shape: a new `intention_break` table with `intention_id` as its key. The parent table stays stable.

#### Alternative considered: `intention.behavior_id`

The intention could instead hold a foreign key pointing to the behavior row. We did not go this route because it inverts the ownership: the behavior would need to exist before the intention, and the intention would carry a nullable column until the behavior is created. It also obscures that `Block` is not a standalone concept but configuration that belongs to an intention.
