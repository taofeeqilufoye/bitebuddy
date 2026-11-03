# BiteBuddy on Replit

## Run the app

- Use the **Start application** workflow (`npm run dev`). Vite serves the React interface on port 5000 and proxies `/api` requests to the Express server on port 3000.
- Replit provides `DATABASE_URL` for PostgreSQL. `SESSION_SECRET` must be set in Replit Secrets; never put either value in source control or a local config file.
- Apply the tracked PostgreSQL schema with `npm run db:migrate` after setting up the project database. The migration creates only the `users` account table and the PostgreSQL `session` table used by the session store.
- Run `npm run typecheck`, `npm run build`, and `npm test` for local checks.
- The production server serves the built client from `client/dist`; build with `npm run build` and start with `node dist/index.js`.

## Accounts story scope

This implementation includes email/password signup, login, logout, and a protected welcome page. It does not include restaurant, cuisine, or stars data, or journal features.

Account passwords are bcrypt-hashed. Sessions are stored in PostgreSQL and use HTTP-only, same-site cookies; production cookies are secure and the server trusts one Replit proxy hop. Mutating API routes require a session-bound CSRF token and same-origin requests when an Origin header is supplied. Login attempts are rate-limited.
