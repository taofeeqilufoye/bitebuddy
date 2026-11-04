# Restaurant data-isolation evidence

The integration test uses separate accounts: A owns a disposable restaurant, and B must not see or change it. B's dashboard must exclude A's data.

## RED

The supervising assistant ran `npm test -- tests/required-isolation.test.ts` in the actual Replit Shell with the collection owner filter temporarily removed. It failed at `tests/required-isolation.test.ts:134:7`: expected `false`, received `true` because B's list contained A's restaurant. The initial run and clean reruns failed at the same assertion; the latest reported run was 06:24:42 UTC and took 4.17 seconds.

[RED screenshot — isolation-red.jpg](./isolation-red.jpg)

## GREEN

After the owner filter was restored, the supervising assistant ran the same command in the actual Replit Shell. It passed 1 file / 1 test at 06:27:49 UTC and took 2.62 seconds.

[GREEN screenshot — isolation-green.jpg](./isolation-green.jpg)

## What breaks isolation

Removing the owner filter from `GET /api/restaurants` exposes A's restaurant in B's collection, so the test's “B must not list A” assertion fails.

## Full suite

Replit Agent ran `npm test`: 8 files / 31 tests passed in 20.84 seconds.

## Dashboard average evidence

**RED:** The supervising assistant ran `npm test -- tests/required-dashboard.test.ts` in the Replit Shell; 1 test failed at `tests/required-dashboard.test.ts:150:29`, expected 4, received 2.7 (06:43:54 UTC, 2.48 seconds).

[Dashboard RED screenshot — dashboard-red.jpg](./dashboard-red.jpg)

**GREEN:** After restoring the original average calculation, the supervising assistant ran the same command; 1 test passed (06:45:11 UTC, 2.78 seconds).

[Dashboard GREEN screenshot — dashboard-green.jpg](./dashboard-green.jpg)

**What breaks this test:** Dividing the ratings sum by `COUNT(*)` includes the unrated entry in the denominator, so A's 5, 3, and null ratings average 2.7 instead of 4.0.

**Full suite:** Replit Agent ran `npm test`; 9 files / 32 tests passed at 06:46:05 UTC (23.06 seconds).
