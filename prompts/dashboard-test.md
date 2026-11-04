# Issue 19 — required dashboard average test

## Exact user prompt

> Checkpoint PR30 is merged and published; live primary dashboard verified Saved5 Visited5 Average4.2. Begin ONLY required dashboard test issue #19. Fetch origin; create test/dashboard-average from origin/main (155831e5af0da838d314fbf61344676b11e45364 or latest main), preserve all refs, never reset/forcepush/pushmain. Save this exact key prompt and relevant actual responses in prompts/dashboard-test.md. Add dedicated tests/required-dashboard.test.ts using real Express/Supertest signup/session/API and confirmed NONPRODUCTION DB guarded like required-isolation test with unique fixtures and cleanup only its own rows/sessions. Match original PLAN scenario: A ratings5 and3 plus null, B rating1; A saved3 average4.0 excluding null and B; empty account null average/count0; assert visited/cuisine if helpful. No new service or dependencies. First run green preflight. Then temporarily break ONLY dashboard average calculation in server/app.ts to divide rating sum by COUNT(*) including unrated instead of correct AVG; leave test unchanged. DO NOT publish or merge or change any other runtime/config. STOP with defect active in development and report exact Shell command for me to run/capture genuine RED screenshot. I will then ask you to restore original runtime byte-for-byte and capture GREEN. Do not fabricate screenshots or browser evidence. Full suite after restoration only. Do not start usability or docs yet.

## Relevant assistant response

> I’ll fetch `origin` and create `test/dashboard-average` from the latest `origin/main` only if the current tree is clean and the branch name is unused. Then I’ll inspect the dashboard route, plan scenario, and existing development-database guard before adding the test.

## Branch and scope

- Fetched `origin`; created `test/dashboard-average` from `origin/main` at `155831e5af0da838d314fbf61344676b11e45364` before editing.
- The working tree was clean before switching. Existing refs were preserved; no reset or force-push was used.
- The test uses the real Express app and Supertest session agents, with unique disposable accounts and cleanup limited to those users and their sessions.
- The test guard rejects `NODE_ENV=production` and permits only the confirmed Replit development database `heliumdb` when it is not a read replica. No production database was accessed.

## Actual results

- The targeted green preflight ran as `npm test -- tests/required-dashboard.test.ts`: **passed**, 1 file / 1 test, started at 06:43:13, duration 4.27 seconds.
- The test used the real Express signup/session/dashboard routes and three unique disposable accounts. The development database guard passed; the `afterAll` cleanup completed without error. No production database was accessed.

## Current red-capture handoff

- After the green preflight, only the dashboard average SQL expression in `server/app.ts` was changed from `AVG(rating)` to `SUM(rating) / COUNT(*)`. This intentionally includes unrated restaurants in the denominator; A's 5, 3, and null entries should produce 2.7 instead of 4.0.
- `tests/required-dashboard.test.ts` remains unchanged.
- Run `npm test -- tests/required-dashboard.test.ts` in the Replit Shell to capture the genuine RED result.
- No test was run after the intentional defect. No screenshot or browser evidence is claimed. The full suite is deferred until restoration.
