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
