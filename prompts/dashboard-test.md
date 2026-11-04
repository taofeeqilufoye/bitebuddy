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

## Follow-up user prompt (verbatim)

> Actual GREEN captured unchanged test in Replit Shell npm test -- tests/required-dashboard.test.ts, start06:45:11UTC duration2.78s,1file1test passed. Record exact result and prompt honestly (supervising assistant ran targeted Shell; you run full suite next). Run npm test full suite once with restored code. Append dashboard section to test-evidence/README.md preserving isolation section; concise actual RED/GREEN explanation, relative dashboard-red.jpg/dashboard-green.jpg links, and what-breaks sentence. No upload-coordination text in final evidence README; historical log can state images will be added externally before merge. Verify final server/app.ts/.replit exact origin/main and cumulative PRdiff test/docs ONLY; preserve temporary defect checkpoint refs without rewriting. Commit/push test/dashboard-average, report SHA/full result/createPR URL. No merge,publish,usability,or other docs. I will upload both authentic images before merge.

## Actual results

- The targeted green preflight ran as `npm test -- tests/required-dashboard.test.ts`: **passed**, 1 file / 1 test, started at 06:43:13, duration 4.27 seconds.
- The test used the real Express signup/session/dashboard routes and three unique disposable accounts. The development database guard passed; the `afterAll` cleanup completed without error. No production database was accessed.

## Final verification prompt (verbatim)

> Actual GREEN captured unchanged test in Replit Shell npm test -- tests/required-dashboard.test.ts, start06:45:11UTC duration2.78s,1file1test passed. Record exact result and prompt honestly (supervising assistant ran targeted Shell; you run full suite next). Run npm test full suite once with restored code. Append dashboard section to test-evidence/README.md preserving isolation section; concise actual RED/GREEN explanation, relative dashboard-red.jpg/dashboard-green.jpg links, and what-breaks sentence. No upload-coordination text in final evidence README; historical log can state images will be added externally before merge. Verify final server/app.ts/.replit exact origin/main and cumulative PRdiff test/docs ONLY; preserve temporary defect checkpoint refs without rewriting. Commit/push test/dashboard-average, report SHA/full result/createPR URL. No merge,publish,usability,or other docs. I will upload both authentic images before merge.

## RED report prompt (verbatim)

> Actual RED captured from Replit Shell: npm test -- tests/required-dashboard.test.ts; start06:43:54 UTC duration2.48s,1file1test failed. Assertion tests/required-dashboard.test.ts:150:29 shows expected averageRating4,received2.7. Original screenshot saved externally; I will upload before PR merge. Restore ONLY the dashboard average expression to exact origin/main byte-for-byte now, leaving test unchanged. Verify server/app.ts/.replit exact origin/main. Record actual RED and this prompt in log. STOP ready for my GREEN Shell run; no publish, commit/push, or full suite yet. Preserve checkpoint history.

## Actual RED result

- The user reported an actual Replit Shell run of `npm test -- tests/required-dashboard.test.ts`, starting at 06:43:54 UTC and lasting 2.48 seconds.
- It failed 1 file / 1 test at `tests/required-dashboard.test.ts:150:29`: expected `averageRating` 4, received 2.7.
- The red screenshot was saved externally and is not present in this workspace.

## Actual GREEN result and restoration

- Restored only the dashboard average expression to the `origin/main` implementation. `tests/required-dashboard.test.ts` remains unchanged.
- The supervising assistant reported the actual Replit Shell command `npm test -- tests/required-dashboard.test.ts` passed 1 file / 1 test at 06:45:11 UTC, duration 2.78 seconds.
- The two authentic screenshots will be uploaded externally before merge; neither is present in the workspace as of this log update.
- Replit Agent ran `npm test`: **passed**, 9 files / 32 tests, started at 06:46:05, duration 23.06 seconds.
- No build was run because `server/app.ts` and `.replit` match `origin/main` byte-for-byte.
