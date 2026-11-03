# Story 4 — edit and delete restaurants

## User prompt — verbatim

```text
Next scoped feature only: GitHub Issue #9 edit/delete. Journal PR #20 is merged at fbc91a4bb9ece4f89c5cdceb5aff419253d6c815 and republished; independent live create/detail/list/decimal-rating checks passed with five real primary entries and a separate demonstration account. Do NOT access/change production data. Fetch origin, create feature/edit-delete from origin/main at that merge BEFORE editing, preserving archive refs. Implement ONLY PLAN.md story4: authenticated owner-only PATCH (or PUT) and DELETE restaurant routes with existing CSRF/validation; prefilled edit form via stable route; explicit restaurant-named Are you sure? confirmation before deletion; Cancel preserves data; save refreshes details/list and updated_at; delete returns to collection and DB cascades stars. Generic404 for foreign IDs and never accept user_id changes. Preserve optional blank/null and decimal ratings. Do not add stars/search/dashboard/random/visited controls/dark or extra features. Original PLAN unchanged. Write exact prompt/relevant responses/results to prompts/edit-delete.md. Add meaningful disposable development checks for edits/persistence/foreign-user rejection/delete/cascade, plus browser confirmation cancel if available; run typecheck/build/tests, restart workflow if stale, and avoid claiming unperformed UI checks. Commit/push only feature/edit-delete; no main commit/push, merge, or publish. Report final SHA and results.
```

## User browser update — verbatim

```text
Independent dev browser checks completed successfully while this task is active: created only disposable restaurant id58 under bitebuddy.browser.check@example.test, initial name “Development edit confirmation check”, Thai4.6 and note “Disposable development-only edit and Cancel verification.” Edit form was prefilled correctly. Renamed it “Development edit confirmation check updated” and cleared rating; save detail showed new name/No rating yet. Opened Delete restaurant: explicit named Are you sure? confirmation appeared. Clicked Cancel, reloaded /restaurants/58, and record/edited values remained. Screenshot captured. Record these actual independent checks in prompts/edit-delete.md. Before final commit, verify exact id58/name/owner and clean up ONLY that disposable development restaurant; do not touch other rows or production. Keep original scope and tests, commit/push branch only.
```

## User completion instruction — verbatim

```text
Continue on Free mode only; do not upgrade. The final browser timeout you described is a text-case assertion mismatch, not evidence of an app failure. Use the actual uppercase NOTHING SAVED YET or a case-insensitive locator for that final check; do not change product text just to satisfy the test. Finish the existing feature/edit-delete task only: verify all synthetic development fixtures (including exact id58 cleanup) are gone, record all exact prompts and honest outcomes in prompts/edit-delete.md, inspect scope, rerun only checks justified by any code changes, commit/push ONLY feature/edit-delete, and report final SHA/test results/PR link. Do not commit/push main, add features, upgrade agent mode, merge, or publish.
```

## Relevant agent responses — verbatim

```text
The current checkout is still on `feature/restaurant-journal` and is one local commit ahead of its remote. I’ll inspect that commit and the existing archive refs, then fetch and branch from the exact merged `origin/main` commit so none of the preserved branch history is overwritten.
```

```text
The requested branch is now checked out at `fbc91a4`, and the existing archive ref is intact. I’m mapping the current owner-scoped restaurant API and page routing so the edit/delete work follows the existing CSRF, validation, and styling patterns without changing the original plan.
```

```text
I’ll add owner-scoped PATCH/DELETE handlers with strict allowlisted fields and unchanged CSRF/validation protections, then wire a prefilled edit route and an explicit named confirmation on the detail page. Tests will create only disposable development accounts/restaurants and verify ownership, timestamps, null/decimal values, and star cascading.
```

```text
The browser flow itself passed: the edit form prefilled, the named confirmation appeared, Cancel kept the entry, and saving refreshed the detail with the new decimal rating. The headless browser hit a temporary-profile cleanup race afterward, so I’m checking and removing only that synthetic development test account and its one restaurant before continuing.
```

```text
I’ll record your independent browser result verbatim in the prompt log. First I’m checking development restaurant 58 against the exact name and owner you gave, then I’ll delete only that matching row and confirm it is absent.
```

```text
I’ll rerun the last browser smoke check using the page’s actual uppercase `NOTHING SAVED YET` text, then verify every synthetic fixture—including the exact ID 58 entry—is gone. After that I’ll finalize the prompt log, inspect the branch-only diff, and push only `feature/edit-delete`; the code checks already passed after the last source change, so I won’t rerun them without a code change.
```

```text
The broader browser run reached the expected empty collection after confirmed deletion; its final wait timed out only because the page renders “NOTHING SAVED YET” in uppercase while the check expected mixed case. Earlier browser checks passed edit prefill, save, named confirmation, and Cancel persistence. I’m reviewing the final diff now, then I’ll write the exact prompts and outcomes to the requested log.
```

## Branch setup and scope

- Fetched `origin` and verified `origin/main` was exactly `fbc91a4bb9ece4f89c5cdceb5aff419253d6c815`; created `feature/edit-delete` at that commit before editing.
- Preserved `archive/local-main-ff04b75`. The previous `feature/restaurant-journal` checkout had an additional local commit titled “Published your App”; it was left untouched. No `main` commit or push was made.
- `PLAN.md` is unchanged. No production database was queried or modified.
- Implemented only Story 4. No favorites, search, dashboard, random picker, visited controls, dark mode, or other feature work was added.

## Implementation and verification outcomes

- Added authenticated, CSRF-protected `PATCH /api/restaurants/:id` and `DELETE /api/restaurants/:id`. PATCH accepts only restaurant detail fields; unknown fields such as `user_id` are rejected. Ownership is checked before PATCH payload validation, and both routes scope their writes to the session owner. Foreign IDs return the same generic 404. Blank city/notes become `null`; decimal ratings remain supported; updates set `updated_at`.
- Added the stable `/restaurants/:id/edit` route and prefilled form. Saving returns to the detail page; the collection reloads current data when opened. The detail page offers Edit details and Delete restaurant. Deletion requires an accessible restaurant-named “Are you sure…” confirmation; Cancel makes no request, and confirmed deletion returns to the collection. The database foreign key cascades stars.
- `npm run typecheck` — passed for server and client.
- `npm test` — passed: 3 test files, 8 tests. New disposable development tests cover authentication and CSRF, invalid/unknown fields, generic foreign-owner rejection even with invalid input, ownership retention, edits and fresh-login persistence, blank/null values, decimal ratings, `updated_at`, updated list output, deletion, and star cascade. Tests run against development only and clean their generated rows.
- `npm run build` — passed for the Vite client and TypeScript server.
- Restarted `Start application`; Vite on port 5000 and Express on port 3000 started cleanly.
- Authenticated Chromium checks passed for edit prefill, saving updated detail values, the named confirmation, Cancel preserving the entry, and browser reload/persistence. The user independently verified the edit form prefill, changed name, clearing rating to “No rating yet,” confirmation, Cancel, and reload for restaurant 58.
- A broader browser run initially timed out because the expected empty-state phrase used mixed case. The actual rendered page had returned to `/` and displayed uppercase `NOTHING SAVED YET`; rerunning with that exact text passed. Confirmed deletion returned to the empty collection, the authenticated detail API returned 404, and the collection API was empty.
- Before cleanup, verified development restaurant ID 58 was exactly “Development edit confirmation check updated”, owned by `bitebuddy.browser.check@example.test`, with zero stars. Deleted only the row matching that ID, exact name, and owner; confirmed ID 58 and the exact name/owner match were absent. The test account was not deleted.
- Checked for all generated browser verification accounts and restaurant rows by their synthetic account prefixes; found zero remaining. No production data was accessed or changed.
- The implementation and test changes are present in local commit `d843bcbcb82dccd3f3a34009c128fecb248159c0` on `feature/edit-delete`; the prompt log is the only remaining workspace change. `origin/main` remains at the requested merge commit.
