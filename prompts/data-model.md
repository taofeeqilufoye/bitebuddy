# Story 2 data model — prompts and evidence

## Original user prompt — verbatim

```text
Next feature only: GitHub Issue #6 https://github.com/taofeeqilufoye/bitebuddy/issues/6. PR #7 is merged at 817b432adf34969f4f16cf891495dc4bb72860ef and the deployed account signup/logout/login has been independently verified at https://bitebuddy.replit.app. Fetch origin; create feature/data-model from origin/main at that merge BEFORE any edits (avoid the stale local main branch; preserve archive/local-main-ff04b75). Implement ONLY PLAN.md story 2: Drizzle PostgreSQL cuisines/restaurants/stars tables plus migrations, cuisine-label seed, and schema.md. Keep users/session. Restaurants: id/user_id/cuisine_id/name nonblank/city nullable/notes nullable/rating nullable/visited false/created_at/updated_at. Rating CHANGE requested from actual user entries: accept one decimal 1.0–5.0, rather than the original integer plan. Shared stars composite PK user_id/restaurant_id; enforce references and owned restaurant via composite FK if practical; cascade stars on restaurant deletion. No restaurant CRUD routes/UI yet, no stars toggle/dashboard/search/extras. Include Thai, Nigerian, Colombian, Dominican cuisine labels among a compact useful list; no journal seed entries. Validate migrations and database constraints using disposable test records only, run typecheck/build/current account tests. Write exact prompt and relevant responses/results in prompts/data-model.md; document every actual table/type/key/relationship in schema.md including session and migration metadata. Commit/push ONLY feature/data-model; no commit/push main, no merge/publish. Report SHA and results.
```

## Production republish instruction — verbatim

```text
Before finalizing this schema PR, report exactly how its tracked migration and cuisine labels will reach the existing Replit production database on republish. Do not use destructive schema push or copy development users/journal rows over production. If Replit does not automatically apply the tracked Drizzle SQL on republish, include the smallest reliable production migration runner/startup hook in this same data-model branch and document it; keep development and production data separate. Verify the mechanism with disposable development checks. No publishing from the agent. Save this instruction and response in prompts/data-model.md.
```

## Relevant branch result

Fetched `origin`; verified `origin/main` was exactly
`817b432adf34969f4f16cf891495dc4bb72860ef`; created `feature/data-model` at
that commit before edits. Preserved `archive/local-main-ff04b75` at
`ff04b75f51e870dd1478c813f7536f76dff781d1`. The stale local `main` was not
checked out or changed.

## Production migration response

Checked Replit's official [development and production database documentation](https://docs.replit.com/features/data-and-storage/development-and-production).
The relevant documentation result was:

> When you publish your Replit App, Replit automatically detects schema differences between your development database and the production database. It uses Drizzle to generate and apply the necessary SQL migrations to bring your production database schema up to date. This process synchronizes tables, columns, indexes, and other schema objects, but it does not copy your development data rows or seeds into production.

Therefore, republish applies the production **schema** by comparing the
development and production databases; it does not directly execute the
repository's tracked Drizzle SQL files or copy the cuisine seed rows. No custom
production DDL/migration runner was added. Instead, Express awaits an
idempotent cuisine-label insert before listening. The insert uses only the
static shared labels and `ON CONFLICT DO NOTHING`, and each runtime uses its own
configured database: development inserts into development; production inserts
into production after the supported publish-time schema change. No user or
journal records are transferred. No production query or publish was performed.

## Plan deviation to preserve for Plan vs. Reality

`PLAN.md` section 3 originally describes integer ratings. This issue explicitly
changed ratings to one decimal place from 1.0 through 5.0. The original plan
sections were left untouched; PostgreSQL enforces the requested range and
one-decimal increments.

## Actual checks and results

- `origin/main` and the new branch start: `817b432adf34969f4f16cf891495dc4bb72860ef`.
- Confirmed the development connection was the Replit development database;
  production was not queried.
- `npm run db:generate` created migrations `0002_left_kabuki` and
  `0003_remarkable_wasp`; `npm run db:migrate` applied them to development.
  Read-only inspection found four applied Drizzle migration records total,
  including the two existing account migrations.
- Development schema inspection confirmed all application columns, constraints,
  foreign keys, indexes, the existing `users` and `session` tables, and
  `drizzle.__drizzle_migrations`.
- Constraint tests used disposable test users/restaurants/stars inside a
  transaction that always rolled back. They verified valid 4.5 ratings,
  rejection of whitespace-only names and invalid/finer-than-tenth ratings,
  foreign-key enforcement, duplicate-star prevention, owner enforcement, and
  star deletion cascade.
- The cuisine seed test used a temporary table inside a rolled-back transaction,
  invoked the seed twice, and verified exactly one row for each of the 16 labels.
- Local production-mode startup smoke: ran the built server with
  `NODE_ENV=production PORT=5101` against the Replit development database; the
  seed completed before Express listened and the built React page served on
  port 5101. This did not connect to or modify production.
- Replit temporarily added a `5101→3000` port entry while that local smoke
  server ran. `.replit` was restored to the committed branch version; no
  deployment or port changes are included.
- `NODE_ENV=development npm test`: passed, 2 files and 5 tests (including all
  existing account tests).
- `npm run typecheck`: passed for server and client.
- `npm run build`: passed for the React/Vite client and Express server.
- No restaurant CRUD routes or UI were added. `PLAN.md` was not changed.
