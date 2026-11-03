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
- The supervising assistant has not run that command after the intentional defect and has not claimed or captured a red screenshot.

## Current requested handoff

After the green run, only the owner predicate in the `GET /api/restaurants` collection query in `server/app.ts` is being removed temporarily. The database remains the Replit development database; `main` and live production remain unchanged. The test and evidence log are uncommitted and unpushed. The supervising assistant will stop after applying the defect and wait for the user's Shell run and screenshot.
