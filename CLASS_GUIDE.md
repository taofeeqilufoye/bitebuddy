# BiteBuddy class guide

## How a request travels

In development, the browser runs the React/TypeScript app served by Vite on port 5000. Vite proxies `/api` requests to the Express/TypeScript server on port 3000. In production, Express serves the built React files and the API from the same process on port 5000.

The browser signs in with email and password. Express hashes passwords with bcryptjs, stores session data in PostgreSQL, sends an HTTP-only session cookie, and uses CSRF tokens for changes. Each private route gets the account ID from the server-side session, then scopes its database query to that owner. The browser never chooses whose records a request can read or change.

## Tables and relationships

- `users`: primary key `id`; email is normalized and unique.
- `cuisines`: primary key `id`; unique, nonblank shared label.
- `restaurants`: primary key `id`; foreign keys to its owner and cuisine. `user_id` plus `id` is also unique to support the owner-aware star relationship.
- `stars`: composite primary key `(user_id, restaurant_id)`; its composite foreign key requires the star owner to be the restaurant owner.
- `session`: session-library table with `sid` primary key, JSON session data, and expiration timestamp.

The database also has the Drizzle migration metadata table. See [schema.md](schema.md) for every column, index, check, and foreign key.

## Null is not zero

City and notes can be `NULL` when they are blank. A `NULL` rating means “not rated”; zero is invalid because ratings run from 1.0 to 5.0 in tenths. `visited = false` is a real status meaning “Want to try,” not a missing value. Stars are separate rows, not a rating or a restaurant flag.

The primary dashboard’s five actual ratings total 21.2: `21.2 ÷ 5 = 4.24`, shown as 4.2 to one decimal. The average excludes unrated rows and other accounts.

## Collection behavior

Search, cuisine/status filters, and sort operate on the current owner’s collection. The picker chooses only from the visible filtered list; in the Starred view it uses the filtered starred list. The light/dark choice starts from device preference and stores an explicit choice in browser local storage.

## Required RED/GREEN tests

The owner-isolation test fails if the collection query loses its owner predicate. The dashboard-average test fails if the average denominator counts an unrated restaurant or includes another user’s rating. Both tests use actual Express routes and separate sessions; both are guarded to the nonproduction Replit Development database.
