# Issue #16 — Visited status

## Exact user prompt

```text
PR26merged7721c632ee3fedfb43dca5925b89faec46c2228e, deployed/liveverified Thai singlepickLittlePlearn, Nigerianpickbelongsvisible2,oldchoiceclears,zeroquerydisabled/help,StarredsingleParche;temporarystarrestored. Begin ONLY issue16/PLAN story10 on Free. Fetch/create feature/visited FROM current origin/main before edits; preserve refs/no main commits/push/reset/force. Add owner+CSRF-protected persisted Visited/Want to try toggle on cards/detail, clear accessible state; status filter combines existing search/cuisine/sort+Starred and picker. Preserve all ratings/notes/star state when toggled; dashboard visited count refreshes correctly. No other features/dependencies. Add meaningful API/filter integration checks for persistence,foreign-ID denial,unchangedrating/dashboardcount;typecheck/build, skipbrowser(rootchecks). PLAN unchanged. Exact prompts/responses/results in prompts/visited.md. Commit/push only branch, reportSHA/checks/PRlink; no merge/publish/dark yet. Minimal assignment implementation and included-plan resources only.
```

## Relevant prior response

- PR #26 was reported merged at `7721c632ee3fedfb43dca5925b89faec46c2228e`, deployed, and independently live-verified for the random picker, including the temporary star restoration.

## Branch inspection and implementation

- Fetched `origin` and confirmed `origin/main` at `7721c632ee3fedfb43dca5925b89faec46c2228e`.
- Created `feature/visited` from that exact commit before editing. Preserved existing branches and archive refs; did not reset, force-push, or modify `main`.
- Added authenticated, CSRF-protected `PUT /api/restaurants/:id/visited`. It validates a boolean, scopes updates to the session owner, returns the generic restaurant 404 for foreign IDs, and updates only `visited` and `updated_at`.
- Added accessible visited/Want to try toggles on collection and Starred cards and restaurant details. Added a status filter to both views; it composes with query, cuisine, and sort and is applied to the same visible list used by the picker. Dashboard visited totals continue to come from the existing owner-scoped dashboard API.
- Kept `PLAN.md`, account/session behavior, and all out-of-scope features unchanged. No dependencies were added.
- No browser automation was run, as requested. No production database was accessed.

## Verification results

- `npm run typecheck` — passed.
- `npm test` — passed: 6 test files, 26 tests. Includes owner/CSRF/foreign-ID checks, invalid status rejection, status persistence across a new login, preservation of rating/notes/star state, dashboard count changes, and combined search/cuisine/status/sort filtering.
- `npm run build` — passed. Vite emitted a bundle-size advisory: the minified JavaScript bundle is 717.33 kB (209.49 kB gzip).
- Restarted the existing `Start application` workflow. Vite became ready on port 5000 and Express reported the API on port 3000; no startup errors appeared in the workflow log.
- `git diff --check` — passed. Scope review showed only the visited API, client controls/filtering, focused tests, and this prompt log; `PLAN.md` is unchanged.
- No browser automation or production database access was performed. The integration suite uses disposable development test accounts and its existing cleanup hook.
- Commit and branch push results will be added before handoff.
