# Production startup configuration — GitHub issue #5

## Original user prompt — verbatim

```text
New scoped task: GitHub issue #5 https://github.com/taofeeqilufoye/bitebuddy/issues/5. After completing the read-only report, create fix/production-startup from origin/main cc02e072a69935c044bd998e2a3594d644a1e19f BEFORE editing. Implement only explicit Replit autoscale production deployment configuration: build npm run build; start with NODE_ENV=production and node dist/index.js on the correct production port. Ensure production uses the built React assets and secure session cookies. Inspect Replit-supported configuration guidance and choose the simplest correct settings. Keep all account behavior and original PLAN.md unchanged. Save this exact prompt, the relevant deployment-gap response, and actual checks in prompts/production-startup.md. Run typecheck/build, existing account tests in development, and a local production-mode smoke test including asset serving and cookie behavior. Do not publish, change billing/settings, expose secrets, add features, commit to main, or push main. Commit and push only fix/production-startup when verified and report SHA/results; I will create/merge the PR.
```

## Relevant deployment-gap response — verbatim

> Deployment inspection found no active deployment and no configured production target, build command, or run command in `.replit`. The existing project scripts support **build:** `npm run build`; **start:** `node dist/index.js`; **port:** listens on `0.0.0.0`; uses `PORT` when provided, otherwise defaults to `3000`. The server requires `NODE_ENV=production` to serve the built client and enable secure cookies/proxy trust; production currently has no explicit `NODE_ENV` value, and Replit’s docs don’t confirm whether it is set automatically. `SESSION_SECRET` is present in Replit’s production secrets; its value was not accessed or displayed. The app also needs Replit PostgreSQL’s runtime `DATABASE_URL`.

## Scoped port instruction — verbatim

```text
Keep development preview usable as well as production: prefer the existing 5000→80 public mapping and remove the external mapping for internal API port 3000. Run production Express with PORT=5000 NODE_ENV=production node dist/index.js, so both dev Vite and production Express use the same public 5000 port in their respective modes. Do not move the public mapping to 3000 if that makes the dev UI inaccessible. Verify both preview and production-mode static serving. Record this scoped configuration instruction in the prompt log.
```

## Actual checks

- Branch created before edits: `fix/production-startup`, based on `cc02e072a69935c044bd998e2a3594d644a1e19f`.
- Replit deployment guidance confirmed Autoscale build/run commands belong in `.replit` under `[deployment]` and only one external port should map to port 80. The final config uses Autoscale, build `npm run build`, run `PORT=5000 NODE_ENV=production node dist/index.js`, keeps `5000→80`, and leaves API port 3000 internal-only.
- `NODE_ENV=development npm test`: passed, 1 test file and 3 account-flow tests.
- `npm run typecheck`: passed for server and client.
- `npm run build`: passed; Vite generated the React assets and TypeScript compiled the Express server.
- Development preview: a first capture during the branch/workflow reload showed the CSRF bootstrap error. After restarting the workflow, the 5000 preview rendered the signup UI normally; Express listened on 3000 and the only browser errors were expected signed-out `/api/me` 401s.
- Production-mode smoke test (`NODE_ENV=production PORT=5000 node dist/index.js`): passed. The server returned built HTML, bundled JavaScript, and the favicon; proxy-trusted session cookies were `Secure`, `HttpOnly`, and `SameSite=Lax`; the CSRF token survived a cookie-backed request; logout destroyed the session and `/api/me` returned 401 afterward. The temporary smoke-test session was logged out.
- No account source, package scripts, or `PLAN.md` content changed. No deployment was published.
