# Restaurant data-isolation test evidence

This evidence demonstrates that two separate accounts do not share restaurant data. Account A creates a disposable restaurant. Account B must not see it or change it, and B's dashboard must not include A's data.

## RED result

The supervising assistant ran `npm test -- tests/required-isolation.test.ts` in the actual Replit Shell while the collection's owner filter was temporarily removed. It failed at `tests/required-isolation.test.ts:134:7`: the test expected B's list not to contain A's restaurant, but it did. The initial RED run and clean reruns reportedly failed at the same assertion. The latest reported run was at 06:24:42 UTC and lasted 4.17 seconds.

The supervising assistant reported that the full Replit UI was captured without editing. The screenshot file will be uploaded by the user:

[RED screenshot — isolation-red.jpg](./isolation-red.jpg)

## GREEN result

The owner filter has been restored. The supervising assistant reported running the command below in the actual Replit Shell after restoration. It passed 1 file / 1 test at 06:27:49 UTC and took 2.62 seconds. The supervising assistant reported saving `isolation-green.jpg` as a full-UI screenshot without editing. It will be uploaded via GitHub before merge; it is not present in this workspace yet.

```sh
npm test -- tests/required-isolation.test.ts
```

[GREEN screenshot — isolation-green.jpg](./isolation-green.jpg)

## What breaks the test

The collection endpoint must filter restaurants by the signed-in user's ID. If that owner restriction is removed from `GET /api/restaurants`, B's collection can include A's restaurant, so the assertion that B's list excludes A fails. The same integration test also checks that B receives not-found responses for A's detail, edit, delete, star, unstar, and visited requests, and that B's dashboard excludes A's data.

## Full test suite

The Replit Agent ran `npm test` after restoring the owner filter. It passed: 8 test files and 31 tests, started at 06:29:23, duration 20.84 seconds.
