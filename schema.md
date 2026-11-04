# BiteBuddy database schema

This document records the application schema in the Replit **development**
PostgreSQL database after applying the tracked Drizzle migrations. Production
was not queried or changed during this documentation pass.

## Application tables

### `public.users`

| Column | PostgreSQL type | Null | Default |
| --- | --- | --- | --- |
| `id` | `integer` (`serial`) | no | sequence |
| `email` | `character varying(254)` | no | — |
| `password_hash` | `text` | no | — |
| `created_at` | `timestamp with time zone` | no | `now()` |

Keys and rules: primary key `users_pkey (id)`; unique `users_email_unique
(email)`; check `users_email_normalized` requires the stored email to equal
`lower(btrim(email))`.

### `public.session`

This is the existing `connect-pg-simple` session store table. It was retained.

| Column | PostgreSQL type | Null | Default |
| --- | --- | --- | --- |
| `sid` | `character varying` | no | — |
| `sess` | `json` | no | — |
| `expire` | `timestamp(6) without time zone` | no | — |

Keys and indexes: primary key `session_pkey (sid)`; expiry index
`IDX_session_expire (expire)`. It has no foreign-key relationship to `users`.

### `public.cuisines`

| Column | PostgreSQL type | Null | Default |
| --- | --- | --- | --- |
| `id` | `integer` (`serial`) | no | sequence |
| `name` | `text` | no | — |

Keys and rules: primary key `cuisines_pkey (id)`; unique `cuisines_name_unique
(name)`; check `cuisines_name_nonblank` requires at least one non-whitespace
character.

The 17 shared labels are American, Caribbean, Chinese, Colombian, Dominican,
Ethiopian, French, Greek, Indian, Italian, Japanese, Korean, Mexican,
Nigerian, Other, Thai, and Vietnamese. `server/index.ts` calls the repeat-safe
`seedCuisineLabels()` before Express listens; the runtime seed inserts missing
labels with `ON CONFLICT DO NOTHING`. No restaurants or other journal records
are seeded.

### `public.restaurants`

| Column | PostgreSQL type | Null | Default |
| --- | --- | --- | --- |
| `id` | `integer` (`serial`) | no | sequence |
| `user_id` | `integer` | no | — |
| `cuisine_id` | `integer` | no | — |
| `name` | `text` | no | — |
| `city` | `text` | yes | — |
| `notes` | `text` | yes | — |
| `rating` | `numeric` | yes | — |
| `visited` | `boolean` | no | `false` |
| `created_at` | `timestamp with time zone` | no | `now()` |
| `updated_at` | `timestamp with time zone` | no | `now()` |

Keys and rules:

- Primary key `restaurants_pkey (id)`.
- Unique key `restaurants_user_id_id_unique (user_id, id)`, which is the
  target of the owner-scoped stars foreign key.
- `restaurants_user_id_users_id_fk`: `user_id → users.id`, `ON DELETE CASCADE`.
- `restaurants_cuisine_id_cuisines_id_fk`: `cuisine_id → cuisines.id`,
  `ON DELETE RESTRICT`.
- `restaurants_name_nonblank` rejects names containing only whitespace.
- `restaurants_rating_one_decimal_range` permits `NULL` or numeric values from
  1.0 through 5.0 in increments of 0.1. Values with finer precision are
  rejected rather than rounded.
- Indexes: `restaurants_user_created_at_idx (user_id, created_at DESC)` and
  `restaurants_cuisine_id_idx (cuisine_id)`.

`updated_at` has a database default but no trigger; future update code must set
it when changing a row.

### `public.stars`

| Column | PostgreSQL type | Null | Default |
| --- | --- | --- | --- |
| `user_id` | `integer` | no | — |
| `restaurant_id` | `integer` | no | — |
| `created_at` | `timestamp with time zone` | no | `now()` |

Keys and relationships:

- Composite primary key `stars_pkey (user_id, restaurant_id)` prevents duplicate
  stars for the same user and restaurant.
- `stars_user_id_users_id_fk`: `user_id → users.id`, `ON DELETE CASCADE`.
- `stars_owned_restaurant_fk`: `(user_id, restaurant_id) →
  restaurants(user_id, id)`, `ON DELETE CASCADE`. This enforces ownership in
  PostgreSQL and removes a restaurant's stars when it is deleted.
- Index `stars_restaurant_id_idx (restaurant_id)` supports restaurant-side
  lookups and deletes.

## Relationships

- One user has many restaurants; deleting a user cascades to those restaurants.
- One cuisine can be referenced by many restaurants; a referenced cuisine
  cannot be deleted.
- Users and restaurants are related through `stars`. Both the composite key and
  composite owner foreign key prevent duplicate or cross-owner stars.
- Session rows are independent of the domain tables and are managed by
  `connect-pg-simple`.

## Drizzle migration metadata

Drizzle's migration runner created `drizzle.__drizzle_migrations` in the
development database:

| Column | PostgreSQL type | Null | Default |
| --- | --- | --- | --- |
| `id` | `integer` (`serial`) | no | sequence |
| `hash` | `text` | no | — |
| `created_at` | `bigint` | yes | — |

It has primary key `__drizzle_migrations_pkey (id)`. Four migration records
were present in Development when this schema was checked. The tracked journal
is `drizzle/meta/_journal.json`; it has entries for migrations `0000` through
`0003`.

## Comparison with original Plan section 3

- The planned `users` table, shared `cuisines` table, owner-linked
  `restaurants` table, and shared `stars` table are present. `users.email` is
  normalized and unique; restaurant and star ownership is enforced in both
  application queries and database keys.
- Plan section 3 specifies an integer rating from 1 to 5. The user requested
  tenths to preserve actual restaurant ratings, so the implemented column is
  nullable PostgreSQL `numeric` with a database check allowing `NULL` or
  1.0–5.0 in 0.1 increments. Invalid precision is rejected rather than
  rounded. The original Plan text remains unchanged.
- The Plan allows a session support table when required by the session
  library. The actual `public.session` table is used by `connect-pg-simple`;
  it is independent of the domain-table foreign keys.
- The Plan requires small shared cuisine data. The current seed contains 17
  labels, including the `Other` fallback; it contains no restaurant journals.
- `drizzle.__drizzle_migrations` is migration-runner metadata, not a domain
  table.

## Production republish behavior

Replit's [development and production database documentation](https://docs.replit.com/features/data-and-storage/development-and-production)
says republishing compares the development and production schemas, then uses
Drizzle to generate and apply the SQL needed to synchronize schema objects.
That is how the new tables, keys, checks, and indexes reach the existing
production database; republish does **not** execute these repository migration
files directly.

The publish flow does not copy development data rows or seeds. To provide the
shared labels without copying users or journal rows, `server/index.ts` awaits
the idempotent `seedCuisineLabels()` insert before Express starts. It targets
the database configured for that runtime and uses `ON CONFLICT DO NOTHING`:
development starts seed only development, and production starts seed only
production. This is reference-data DML, not startup schema migration or DDL.
The documentation verification queried Development only; it did not query or
change production.
