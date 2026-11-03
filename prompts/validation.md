# Issue #10 — Validation

## User prompt (verbatim)

```text
PR #21 is merged, origin/main now a942bf521c5c55f4b52b1730870c4a77a9a3b85d, deployed and independently live-verified: prefilled edit, unchanged real values saved successfully, named delete confirmation, Cancel and reload preserve record. Begin ONLY issue #10 / PLAN story5 on Free mode. First fetch origin and create feature/validation FROM origin/main before editing; preserve archive refs, no main commits/push/reset/forcepush. Inspect current validation then make it consistent client/server for create/edit and useful account errors. Required name rejects whitespace; existing cuisine required; optional rating blank/null or1–5 with at most one decimal; sensible name/city/notes limits. Field-level accessible messages linked to labels, error announcement and focus first invalid field, retained values, useful generic API errors without database leakage. Do not silently round invalid ratings. Reuse existing simple stack, no new platform/features/dependencies unless needed. Preserve original PLAN. Record this exact prompt and relevant actual responses/results in prompts/validation.md, properly attribute supervising assistant vs human. Verify blocked invalid requests store no invalid rows; valid decimal and blank create/edit succeed; use disposable DEVELOPMENT fixtures only. Run typecheck/tests/build plus focused browser checks, clean own fixtures only. Commit/push ONLY feature/validation and report final SHA, exact check results and PR link. Do not merge or publish; stop at branch handoff. No favorites/search/dashboard/random/visited/dark work yet, no paid mode/upgrades.
```

## Branch and scope response

- Fetched `origin` and created `feature/validation` from `origin/main` at `a942bf521c5c55f4b52b1730870c4a77a9a3b85d` before editing.
- Preserved existing archive refs. No main branch commit, push, reset, or force-push was made.
- Confirmed `PLAN.md` has no diff from the selected base. No dependencies were added and no production database was accessed.
- Existing limits were 200 characters for restaurant names, 120 for city, and 5,000 for notes. Validation now uses one runtime-neutral Zod module for browser and API rules; it lives under `server/` to preserve the configured server build output root.

## Supervising assistant browser evidence

The supervising assistant (not the human user) reported this independent development browser check:

```text
Independent supervising-assistant development browser check (not human user): /restaurants/new, name three spaces, cuisine unselected, notes “Development validation check: this text should remain after an invalid submission.” Click Add to my collection showed Enter a restaurant name + Choose a cuisine + alert Please correct the highlighted fields; focus moved to name, aria-invalid=true and aria-describedby=restaurant-name-error. Notes and three-space name were retained; no creation occurred. Include accurate evidence in prompts/validation.md. Browser tab3 stays on invalid form; no record cleanup needed for this check. Continue existing task only.
```

That check created no restaurant and required no cleanup.

## Implementation and verification outcomes

- Client and server now share account and restaurant schemas, messages, and limits. Create and edit reject whitespace-only names, missing or invalid cuisines, over-limit name/city/notes, and ratings outside 1.0–5.0 or with more than one decimal place. Blank ratings become `null`; invalid values are rejected without rounding.
- Account forms use the shared email/password checks and expose field errors. Duplicate-signup errors are attached to email; generic server errors remain generic and do not return database details. Forms announce errors, focus the first invalid field, and retain entered values.
- First `npm run typecheck` passed. The first production build exposed `TS6059` because the server build is rooted at `server/`; the shared module was moved inside that build tree without changing the output layout. Final `npm run typecheck` and `npm run build` both passed.
- Final `npm test` passed: **4 test files, 12 tests**. Coverage includes invalid create/edit requests returning field errors without inserts or updates, valid decimal and blank create/edit ratings, field limits, account password byte limits, and rejected account input not creating a user.
- The final browser run exercised the signup form’s empty, invalid email, and short-password errors and first-field focus. It then used a disposable development account to check an invalid `4.56` rating: the rating field was focused and marked invalid, an alert appeared, the name and notes remained, no restaurant POST occurred, and the collection remained empty.
- The same browser run created a restaurant at rating `4.6`, edited it to `4.7`, cleared the rating and saw “No rating yet,” and created another restaurant with a blank rating. The disposable account and its restaurant rows were deleted afterward. The browser-created restaurant ID `98` was checked directly in the development database and had zero remaining rows.
- The first browser automation attempt failed in the test harness because it used the input-element value setter for a notes textarea; no application defect was found, and its disposable account was cleaned. The corrected run above passed. One cleanup-count query also initially failed from shell interpolation of `$1`; the correctly quoted development query confirmed restaurant ID `98` was absent.
- Restarted the existing `Start application` workflow. It came up with Vite on port 5000 and the API on port 3000. The preview screenshot rendered the signup page. Its two 401 console responses were unauthenticated `/api/me` requests from that signed-out screenshot; the authenticated browser checks above succeeded.
- Final `git diff --check` passed, and `PLAN.md` remained unchanged.

## Attribution

The browser observation explicitly labeled “supervising assistant” above was performed by the supervising assistant, not the human user. The separate automated browser run and development fixture cleanup were performed by the Replit Agent.
