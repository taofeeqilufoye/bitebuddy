# Random picker — prompts and verification record

## Exact implementation prompt

> PR25 merged955adb9e74dd1391095f2ae8df043d3dc255370e, deployed/live verified5saved,avg4.2,cuisineCol1Dom1Nig2Thai1,renderedchart; filteringlistto2Nigerianstilldashboard5. Visited0 expected until issue16. Begin ONLY issue15/PLANstory9 Free. Fetch/create feature/random-picker FROM origin/main before editing; preserve refs/no main commits/push/reset/force. Add simple Pick for me button using current filtered owner collection or Starred list, show chosen name/detail link; zero candidates friendly/disabled, one candidate deterministic. Selection must clear or stay valid when filters/list change. Reuse current visible-list helper; no API/service/AI recommendations/new dependency, no animation or extra features. Add focused meaningful selection tests,typecheck/build; skip browser automation(rootchecks). Preserve PLAN. Exact prompts/responses/results in prompts/random-picker.md. Commit/push only branch, report SHA/checks/PRlink; no merge/publish/visited/dark yet. Included-plan resources only.

## Actual branch and scope

- Fetched `origin` and confirmed PR25 merge `955adb9e74dd1391095f2ae8df043d3dc255370e` is an ancestor of current `origin/main`.
- Created `feature/random-picker` from that exact `origin/main` before editing.
- Preserved the archive and previously inspected refs, including `archive/local-main-ff04b75`, `feature/validation`, `feature/stars`, `feature/find-things`, and local/remote `feature/dashboard`. No main branch changes were made.
- Reused the existing `visibleRestaurants` result, which is already owner-scoped and includes active search, cuisine, and sort settings for either My collection or Starred.
- Added a client-side picker only. No API, services, dependencies, AI recommendations, animation, or unrelated features were added. `PLAN.md` is unchanged; no visited or dark mode work was added.

## Verification outcomes

- `npm run typecheck` — passed.
- `npm test` — passed: 6 test files, 24 tests. The four picker tests cover empty candidates, deterministic single-candidate selection without calling randomness, selection only from active filtered candidates, and retaining/clearing the selected ID when the candidate list changes.
- `npm run build` — passed for the Vite client and Express server. Vite emitted a non-blocking bundle-size advisory (714.88 kB minified client JavaScript); no dependencies were added for this feature.
- `git diff --check` — passed.
- The existing `Start application` workflow remained running and HMR applied the changed UI and CSS files.
- Browser automation skipped as requested. No browser UI result is claimed.
- No production data, deployment, merge, or publish was accessed/performed.

## Relevant progress responses

> I’ll fetch `origin`, confirm PR25 is on `origin/main`, and create `feature/random-picker` from that baseline before editing. Then I’ll reuse the existing filtered-list helper, add a small deterministic selection helper with focused tests, and record the exact prompt and results. I’ll skip browser automation as requested.

> PR25 is confirmed on `origin/main` at `955adb9e…`. The existing worktree is clean, and the archive plus prior feature branches are intact. I’m creating `feature/random-picker` from that commit now, before making any edits.

> `feature/random-picker` is now based exactly on `origin/main` at `955adb9e…`; the local `main` branch and existing refs remain untouched. The current list already computes `visibleRestaurants` from the account’s collection or Starred API plus active filters, so the picker can use that exact array with no API changes. I’m adding a deterministic test seam and selection-validity handling next.
