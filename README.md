# BiteBuddy

BiteBuddy is a private restaurant journal for saving places, recording optional ratings and notes, tracking visits, and choosing a restaurant from the current collection.

**Live app:** [https://bitebuddy.replit.app](https://bitebuddy.replit.app)
The public Replit Autoscale deployment was confirmed active with a successful current build.

## Features

- Email/password accounts with server-side sessions.
- Owner-only restaurant create, browse, detail, edit, and confirmed-delete flows.
- Shared cuisine categories, including **Other**.
- Starred restaurants, name/city search, cuisine and visit-status filters, and sorting.
- A random picker that chooses from the currently visible collection.
- A dashboard with saved count, visited count, average of rated restaurants, and cuisine counts.
- Light/dark appearance with a device-preference default and locally remembered choice.

## Stack and request flow

- React, TypeScript, and Vite provide the browser interface.
- Express and TypeScript provide authentication, CSRF checks, validation, owner-scoped routes, and dashboard aggregation.
- PostgreSQL stores accounts, sessions, cuisines, restaurants, and stars. Drizzle defines the application schema and tracked migrations.
- In development, Vite serves the UI on port 5000 and proxies `/api` requests to Express on port 3000. In production, Express serves the built React assets and API from the same process.
- Sessions use HTTP-only cookies; production cookies are secure and the Express app trusts one proxy hop.

See [schema.md](schema.md) for the actual tables, relationships, constraints, and comparison with Plan section 3.

## Install and run in Replit

The Replit runtime is Node.js 24. Use the Replit Development database; the app requires the environment-specific `DATABASE_URL`. Apply tracked migrations to that development connection when setting up its schema:

```sh
npm install
npm run db:migrate
npm run dev
```

The development workflow uses Vite on port 5000 and Express on port 3000. Server startup idempotently seeds shared cuisine labels; it does not create journal entries. Do not point development setup or tests at production.

## Commands

| Purpose | Command |
| --- | --- |
| Development preview | `npm run dev` |
| TypeScript checks | `npm run typecheck` |
| Production build | `npm run build` |
| Full integration suite | `npm test` |
| Required isolation test | `npm test -- tests/required-isolation.test.ts` |
| Required dashboard-average test | `npm test -- tests/required-dashboard.test.ts` |
| Apply Drizzle migrations to the current `DATABASE_URL` | `npm run db:migrate` |

`tests/required-isolation.test.ts` and `tests/required-dashboard.test.ts` are guarded to run only against Replit's nonproduction Development database named `heliumdb`; they also check that the connection is not a read replica. They create unique disposable accounts and clean up their own fixtures. **No separate test database is provisioned**, so these integration tests are not portable against an arbitrary database URL.

## Environment variable names

The application reads `DATABASE_URL`, `SESSION_SECRET`, `NODE_ENV`, and `PORT`. This README intentionally contains names only, never secret values. Keep `SESSION_SECRET` in Replit Secrets and configure production secrets separately in the Publishing settings; Development secrets do not automatically sync to production.

## Replit publishing

The checked-in `.replit` config uses **Autoscale**:

- Build: `npm run build`
- Start: `PORT=5000 NODE_ENV=production node dist/index.js`
- App port: 5000 (mapped to public port 80)

Publishing compares the Development and production database schemas and applies the supported schema diff. It does not copy Development rows or cuisine seed data. The app seeds the shared labels against whichever environment-specific database it starts with; users and journal entries remain separate. Do not use `npm run db:migrate` as a production migration hook.

Official references: [Autoscale and deployment types](https://docs.replit.com/features/publishing/deployment-types), [Publishing overview](https://docs.replit.com/features/publishing/overview), [Development and production databases](https://docs.replit.com/features/data-and-storage/development-and-production), and [Replit Secrets](https://docs.replit.com/core-concepts/project-editor/app-setup/secrets).

## Project documentation and evidence

- [Implementation plan and final Plan vs. Reality](PLAN.md)
- [Database schema](schema.md)
- [Plan vs. Reality reflection](reflections/plan-vs-reality.md)
- [Stranger-test reflection](reflections/stranger-test.md)
- [Required-test evidence](test-evidence/README.md)
- [Usability evidence](evidence/usability/README.md)
- [Primary dashboard evidence](evidence/dashboard/README.md)
- [Assignment checklist](ASSIGNMENT_CHECKLIST.md)
- [Class guide](CLASS_GUIDE.md)
