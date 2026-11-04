# BiteBuddy 🍽️ — Original Implementation Plan

## 1. Pitch
I'm building BiteBuddy because I want one place to remember restaurants I've visited, save places I want to try, and choose where to eat. I intend to use it when planning meals out, roughly weekly. Other people can create their own private journals.

## 2. Features — build order
Each numbered story gets its own GitHub issue, branch from main, saved key prompts and relevant agent responses in `prompts/<feature>.md`, linked pull request, verification, merge, and deployment check. The planning PR must merge before any implementation. Target: at least 9 merged PRs; this sequence deliberately exceeds that minimum.

1. **Accounts:** As a diner, I want to sign up inside BiteBuddy with email and password, log in, and log out so that I have a private journal. Store a users row per account, hash passwords, and use server-side sessions. Never trust a user ID supplied by the browser.
2. **Related data:** As a diner, I want each restaurant to belong to a cuisine so that my journal has consistent categories. Create the four domain tables below, foreign keys, indexes, and a small shared cuisine list. Every restaurant read or write must check its owner on the server.
3. **Create and read:** As a diner, I want to save a restaurant's name, cuisine, optional city, notes, and optional 1–5 rating, browse my collection, and open its detail page so that I can remember my experiences and plans. New entries start unvisited.
4. **Edit and delete:** As a diner, I want to edit my saved details and delete an entry after an explicit confirmation so that my journal stays accurate. Cancel must preserve the entry.
5. **Validation:** As a diner, I want clear field-level errors for missing or whitespace-only names, missing/invalid cuisines, invalid ratings, and invalid account details so that I can fix mistakes. Validate on both server and client; store no invalid data.
6. **Favorites:** As a diner, I want to star/unstar my restaurants and open a Starred view so that I can quickly find favorites. Use one shared stars junction table with a unique user/restaurant pair; prohibit starring another user's restaurant.
7. **Find things:** As a diner, I want case-insensitive name/city search, a cuisine filter, and newest-first, name A–Z, or highest-rated sorting so that I can find a place quickly. Combine filters and sort, place unrated items last for rating sort, and show a useful empty state.
8. **Dashboard:** As a diner, I want my total saved count, visited count, average rating, and a restaurant-count-by-cuisine bar chart so that I can understand my collection. Average uses non-null ratings only, rounded to one decimal; show “No ratings yet” when none exist. All values use only my records and the full collection, independent of list filters.
9. **Random picker (extra):** As an indecisive diner, I want a random pick from my current filtered collection, including an optional Starred view, so that I can decide where to eat. Show the selected restaurant and detail link; handle zero candidates clearly. No other account's entries are eligible.
10. **Visited toggle (extra):** As a diner, I want to mark a restaurant Visited or Want to try and filter by that status so that I can distinguish experiences from plans. Persist the boolean, refresh the dashboard, and keep the optional rating when toggling.
11. **Dark mode (extra):** As a diner, I want a clearly labeled light/dark toggle so that the app is comfortable at night. Start from the device preference and remember an explicit choice in browser local storage; maintain readable contrast in forms and charts.

## 3. Database
PostgreSQL stores the domain data; IDs are generated numbers. Required unless marked nullable.

| Table | Columns and types | Keys and rules |
| --- | --- | --- |
| users | id: number; email: text; password_hash: text; created_at: date/time | Primary key id; normalized email unique. Never store plaintext passwords. |
| cuisines | id: number; name: text | Primary key id; name unique. Shared labels contain no private journal data. |
| restaurants | id: number; user_id: number; cuisine_id: number; name: text; city: text nullable; notes: text nullable; rating: number nullable; visited: true/false default false; created_at: date/time; updated_at: date/time | Primary key id; foreign keys user_id → users.id and cuisine_id → cuisines.id; rating is an integer 1–5 when present; name must be nonblank. |
| stars | user_id: number; restaurant_id: number; created_at: date/time | Composite primary key (user_id, restaurant_id); foreign keys to users.id and restaurants.id. Server enforces restaurant ownership; restaurant deletion removes its stars. |

Relationships: users 1→many restaurants; cuisines 1→many restaurants; users many↔many restaurants through stars, restricted to owned restaurants in this private-journal app. Add a sessions support table if required by the session library: sid (text primary key), sess (JSON session data), expire (date/time). Document every actual table in schema.md.

## 4. Required tests
Use automated integration tests against a separate disposable PostgreSQL test database, exercising actual server routes with distinct authenticated sessions. Never run intentional breaks against production.

- **Data isolation:** Given User A owns a restaurant and User B has a separate account, when B lists restaurants and requests A's detail, edit, delete, or star routes, then A's restaurant is absent from B's list and all direct access attempts fail without revealing or changing it. Also verify B's dashboard excludes A's data. Red demonstration: temporarily remove the ownership restriction from the list query; capture the resulting failure, restore it, and capture a passing rerun. Removing an ownership predicate would break this test.
- **Dashboard average:** Given A has ratings 5 and 3 and one unrated entry, and B has a rating of 1, when A requests dashboard statistics, then total saved is 3 and average rating is 4.0, excluding the unrated entry and B's rating. Check the empty collection behavior too. Red demonstration: temporarily divide the ratings sum by all saved entries; capture failure, restore the correct denominator, and capture passing results. Counting unrated entries in the denominator would break this test.

Add each required test through its own PR with a plain-English explanation, genuine red/green screenshots, the temporary defect and restoration recorded, and a sentence stating what would break it. Preserve exact key prompts and relevant responses for evidence.

## 5. Technologies
- **Replit Agent**, with Codex coordinating GitHub and verification: use the existing development account and implement one scoped story at a time.
- **React with TypeScript and Vite:** a compact browser interface with reusable forms and views, using Replit's standard web app tooling.
- **Node.js, Express, and TypeScript:** one server for authentication, access checks, and database queries; easy to explain without additional services.
- **Replit PostgreSQL with Drizzle ORM:** relational storage and explicit foreign keys, with parameterized queries and migrations tracked in Git.
- **Email/password authentication using bcryptjs, express-session, and connect-pg-simple:** visitors sign up directly in BiteBuddy without needing Replit accounts; sessions persist in PostgreSQL and use secure, HTTP-only cookies in production. Add sensible login rate limiting and CSRF protection for cookie-authenticated changes.
- **Recharts:** one responsive, accessible cuisine bar chart, with labels or a text equivalent.
- **Vitest and Supertest:** repeatable server integration tests covering access control and actual dashboard results.
- **GitHub:** issues, feature branches, prompt logs, PRs, and merges establish the required development trail. **Replit hosting:** keep the live application current after feature merges. No additional paid platform or restaurant API.

## 6. Design
Use warm cream (#FFF8F0), terracotta (#C2412D), dark charcoal (#262626), and restrained green accents. Borrow the simple saved-place browsing of Google Maps and the uncluttered list organization of Notion, without copying their complexity. Use restaurant cards, legible type, generous spacing, and clear Add restaurant, Starred, Dashboard, and Pick for me actions. Support phone and desktop layouts, keyboard navigation, visible focus, labeled forms, and helpful loading/error/empty states. Dark mode uses charcoal backgrounds and contrasting text and accents. Do not add stock restaurant records to users' journals.

## 7. Risks and cuts
The highest risk is getting private access checks and session cookies correct across development and deployment; verify separate accounts and guessed IDs before relying on the app. A second risk is Replit Agent adding unrequested features or committing on main: provide one-story prompts, inspect diffs and branch state before changes, and save the evidence as work happens. Cut photos, maps, external restaurant lookup, animation, and advanced analytics first; none are required. Preserve every spine feature, the three chosen extras, and the two required tests.

Final verification includes five genuine restaurant entries supplied by the owner, a dashboard screenshot on that account, and a real 10-minute unaided session by someone outside the class. Record three observed struggles, fix one through its own issue/PR, and explain the deferred fixes. Complete README.md with live URL and run instructions, schema.md with the implemented relationships and comparison to this design, and two evidence-linked reflections of 400–600 words each. Do not invent personal experiences or observations.

## 8. Plan vs. Reality
Final status after the issue 29 usability fix; sections 1–7 above remain the
original plan.

| Planned feature | Shipped / Changed / Cut | Status (Done/Backlogged) | Learning | What changed and why (one line) |
| --- | --- | --- | --- | --- |
| Accounts and private journals | Shipped | Done | Server checks must accompany browser views | Email/password accounts, stored hashes, sessions, owner-scoped routes |
| Related data and rating format | Changed | Done | Real examples exposed an integer-only assumption | Same four domain tables plus session; ratings accept tenths to preserve actual data |
| Create/read and edit/confirmed delete | Shipped | Done | Cancellation and direct foreign IDs need verification | Private journal forms, details, edits, and named confirmation |
| Validation | Shipped | Done | Client and server must agree | Shared rules reject blanks, invalid categories, range and precision errors |
| Favorites | Shipped | Done | One junction table can serve every account | Unique owner/restaurant stars and Starred view |
| Search, filter, sort | Shipped | Done | Combining controls requires clear empty states | Name/city search, cuisine/status filters, newest/name/rating ordering |
| Dashboard | Shipped | Done | Null ratings differ from zero | Three owner-scoped statistics and cuisine chart with text equivalent |
| Random picker | Shipped | Done | Random choices must respect visible candidates | Chooses only from current private filtered view |
| Visited toggle | Shipped | Done | Status and rating are independent values | Persisted toggle, status filter, dashboard count |
| Dark mode | Shipped | Done | Preferences should survive reload | Device default and browser-local explicit preference |
| Required test storage | Changed | Done | Existing development storage avoided another service | Guarded Replit development DB and unique disposable fixture cleanup replaced separately provisioned test DB |
| Isolation and dashboard tests | Shipped | Done | A passing test needs a demonstrated meaningful failure | Separate PRs #30/#32, actual RED/GREEN screenshots, restored full suite |
| Usability category fallback | Changed | Done | A fixed list cannot describe every restaurant | Issue #29 adds Other using existing categories; no custom-category editor |
| Password eye, clearer controls and helper | Cut from current scope | Backlogged | Working behavior can still be unclear | Actual feedback recorded; category fallback prioritized for minimal scope |
