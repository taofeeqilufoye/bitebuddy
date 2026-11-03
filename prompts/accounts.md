# Accounts — GitHub issue #3

## Preceding branch inspection

### User prompt

> Only inspect Git state. Planning PR #2 is merged. Fetch origin and switch to the existing origin/feature/accounts branch for issue #3. Report current branch and HEAD before writing code. Do not implement the full plan. Do not commit, push, or publish. Wait for my scoped accounts instruction.

### Agent response

> I’ll check Git state, fetch origin, and switch to the existing accounts branch. I won’t change code, commit, push, or publish.

> Fetched origin and switched to the existing remote accounts branch.
>
> - **Current branch:** `feature/accounts`
> - **Tracking:** `origin/feature/accounts`
> - **HEAD:** `9de788cfbe2ab0208418d8011c63c9c5bb729d6f`
> - **HEAD subject:** `Merge pull request #2 from taofeeqilufoye/docs/initial-plan`
> - **Working tree:** clean
>
> No code written, commits created, pushes, or publishing performed. Waiting for your scoped accounts instruction for issue #3.

## Implementation prompt — verbatim


## Verification record

- `npm run db:generate`: generated tracked PostgreSQL migrations for `users` and the `session` store table.
- `npm run db:migrate`: succeeded against the Replit development database.
- `npm test`: passed; 1 test file, 3 tests. Checks cover signed-out protection, normalized case-insensitive signup and duplicate rejection, bcrypt hash storage, HTTP-only/SameSite cookie attributes, login/logout session behavior, CSRF and cross-origin rejection, field validation, and login throttling. Temporary account data is removed in `afterAll`.
- The first test run caught duplicate-email errors wrapped by Drizzle and returned a 500. The unique-constraint handling was corrected; the final suite passes.
- `npm run typecheck`: passed for server and client TypeScript.
- `npm run build`: passed for Vite and the Express TypeScript server.
- Replit `Start application` workflow: running; Vite preview is on port 5000 and Express API on port 3000.
- Desktop and mobile previews rendered the signup screen. Browser logs contained only the expected 401 response from `/api/me` while signed out; the server workflow started without errors.
- `PLAN.md` was not modified. Only the `users` and PostgreSQL `session` tables were migrated; no restaurant or journal tables were created.
