# Issue 18 — required data-isolation test

## Exact user prompt

> PR28merged191c307516cbf00bf407bf3a6952ac61df3d3774 are deployed/liveverified; darkkeyboard/reload/chartreadable,primary5saved5visitedavg4.2. Begin ONLY issue18/PLANrequired-isolationtest Free. Fetch/create test/data-isolation FROM origin/main before edits; preserve refs/no main commits/push/reset/force. Inspect existing integration test setup and confirm it uses NONPRODUCTION Replit development/test PostgreSQL, unique disposable user fixtures and failure-safe cleanup; never use production. Add dedicated tests/required-isolation.test.ts matching PLAN GivenAownsrestaurant/Bseparatesession: B list/Starred/detail/edit/delete/star/visited requests cannot reveal/change A, Bdashboard excludes A. Use actual authenticated Express routes, no mocked authorization. No new platform/CI/service/dependency. Run targeted test once GREEN to verify setup. THEN temporarily remove ONLY the list-query owner predicate in server/app.ts on this branch, leaving main/live unchanged. STOP after applying that exact defect: report exact test command and defect location, WAIT for my RED screenshot capture. Do not restore yet, commit/push/merge/publish, or start other work. Prepare prompts/data-isolation.md and plain-English explanation/what-breaks-it, recording exact actual prompts/results, not invented evidence. I will run actual test in the Replit Shell and capture screenshot, then ask you to restore. Never deploy intentional defect.

## Relevant assistant response

> I’ll inspect the branch and test/database setup first, confirm the tests can only target a nonproduction database, then create the requested branch from `origin/main` before editing. I’ll run the new isolation test while the code is correct, introduce only the specified list-query defect afterward, and stop without committing or pushing so you can capture the red test.

## Branch and database checks

- Fetched `origin`; its main commit was `191c307516cbf00bf407bf3a6952ac61df3d3774`.
- Created `feature/data-isolation` from that exact `origin/main` commit before editing.
- Left the prior `feature/dark-mode` and `gitsafe-backup/main` refs untouched; the local-only `d87d52b` checkpoint remains preserved there.
- Existing integration tests import the real Express `app`, use Supertest cookie agents, sign up unique users, and clean their session/user fixtures in `afterAll`.
- Replit's development database query returned database `heliumdb`, `pg_is_in_recovery() = false`. The workspace application's configured connection returned the same database and primary status. No production database was accessed.
- The new test refuses `NODE_ENV=production`, verifies the confirmed development database identity before creating fixtures, generates unique emails per run, and removes only those accounts and sessions in `afterAll`, including after assertion failures.

## What the test checks / what breaks it

The test signs up separate A and B accounts through the real Express authentication routes. A creates a disposable restaurant, stars it, and marks it visited. B then tries the collection and Starred lists, detail, edit, delete, star, unstar, visited, and dashboard routes. The test verifies B cannot see or change A's restaurant, while A's database row and star remain intact and B's dashboard stays empty.

Removing the owner filter from `GET /api/restaurants` makes A's restaurant appear in B's collection response. The collection assertion should fail, demonstrating the data-isolation regression. The only intentional defect is to be introduced after the targeted test passes once.

## Actual results

- Before introducing the intentional defect, ran `npm test -- tests/required-isolation.test.ts`: **passed**, 1 test file / 1 test, duration 4.82 seconds.
- The test used two unique disposable accounts and the actual authenticated Express routes. Its `afterAll` cleanup completed without error; no production database was accessed.
- The working-tree database connection and Replit development database both reported `heliumdb`, with `pg_is_in_recovery() = false`.
- The exact command for the requested red capture is `npm test -- tests/required-isolation.test.ts`.
- The supervising assistant later reported the actual RED run from the Replit Shell; details are recorded below.

## Follow-up user prompt (verbatim)

> RED evidence captured by supervising assistant from actual Replit Shell: npm test -- tests/required-isolation.test.ts failed1file/1test at134:7, expectedfalse/receivedtrue because B list contained A fixture. Initialredrunandcleanerrepeatsallfailedsameassertion; latest06:24:42 UTCduration4.17s, screenshotisolation-red.jpg capturedfullUIwithoutediting. Restore ONLY the removed list-query owner predicate now; verify server/app.ts matches origin/main exactly (and .replit unchanged). Do not change the test to pass. Then STOP for my GREEN Shell run/screenshot; do not commit/push/merge/publishyet. Add accurate RED observation/commands to prompts/data-isolation.md, prepare test-evidence/README.md with plainEnglish/what-breaks-it and relative image links isolation-red.jpg/isolation-green.jpg (actual images will be uploaded by me). Keep current feature/data-isolation branch, no need rename; report restorationready.

## Supervising assistant RED evidence

- **Attribution:** supervising assistant, from an actual Replit Shell run; not a human-run test.
- **Command:** `npm test -- tests/required-isolation.test.ts`.
- **Result reported:** 1 file / 1 test failed at `tests/required-isolation.test.ts:134:7`; expected `false`, received `true`, because B's collection included A's fixture.
- The initial RED run and subsequent clean reruns all failed at the same assertion. The latest reported run was at 06:24:42 UTC and took 4.17 seconds.
- The supervising assistant reported capturing `isolation-red.jpg` as a full-UI screenshot without editing. The image itself is to be uploaded by the user; it is not claimed to be present in this workspace yet.

## Restored state and pending GREEN evidence

- Restored only the removed owner predicate in the `GET /api/restaurants` query. The test was not changed.
- No test has been run after restoration. The user will run `npm test -- tests/required-isolation.test.ts` in the Replit Shell and capture the GREEN screenshot.
- The RED and pending GREEN screenshot links are documented in `test-evidence/README.md`; the user will upload the images there.
- No merge or publish was performed. No Git commit or push command was run by the supervising assistant.
