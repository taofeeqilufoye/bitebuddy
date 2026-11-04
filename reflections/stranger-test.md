# Reflection 2 — The stranger test

On November 3, 2026, two people outside my class tried the live BiteBuddy app. I use A and B as anonymous labels; I do not include names. Both created their own accounts and were observed without help for approximately twelve and fourteen minutes. The source notes do not say which duration belongs to which person, so I do not assign them. I record four concerns from those sessions, not additional difficulties inferred from my own later checks.

User B’s exact cuisine feedback was: “the cusine list should include other since the list is not exhaustive”. The list at that time had sixteen fixed cuisines and no general choice. B did not report a failed save, so I do not claim that one occurred. The risk I understood was that a person might have to mislabel a restaurant just to save it. A private journal needs a reasonable fallback when its shared categories do not describe every place.

The other three concerns came from A and B. A expected a way to show the password while typing. A also questioned why a saved restaurant still presented separate “Want to try” and star controls; the issue was that the relationship between saving, visit status, and favoriting was not clear. B found the rating helper, “A personal note to yourself, not a scorecard,” confusingly placed above the Notes field. These are descriptions of the recorded feedback, not additional direct quotations from the testers.

I chose the missing-cuisine fallback for issue #29 because it could be fixed with a small change to the existing shared seed while keeping restaurant relationships and existing journal records intact. PR #33 adds `Other` as a repeat-safe cuisine label. It does not add a custom-category editor or alter the schema. Development verification called the seed twice, then exercised authenticated create, edit, cuisine filtering, and dashboard grouping with disposable records. The fixtures were removed; the shared label remains.

After the change, the supervising assistant independently selected `Other` in the live create form, canceled without saving, and reported that the dashboard remained at five saved, five visited, and a 4.2 average. The supervising assistant also checked the development form; the first login attempt happened during a workflow restart, then succeeded after reload. These were later checks by the supervising assistant, not repeat sessions with A or B. I do not claim the original testers saw the fix or retested the app.

I deferred the password visibility control, clearer status/favorite explanations, and the rating-helper placement. This keeps the fix tied to one observed issue and avoids redesigning or removing working story features. The sessions showed why passing API tests cannot establish that a form communicates clearly: a person can complete an account flow and still be uncertain about what an action means. The useful next step is not to invent more tester struggles, but to keep the four recorded concerns available for a later, deliberately scoped review.

## Evidence

- [Issue #29](https://github.com/taofeeqilufoye/bitebuddy/issues/29) · [PR #33](https://github.com/taofeeqilufoye/bitebuddy/pull/33)
- [Prompt and verification history](../prompts/usability-other-cuisine.md)
- [Usability screenshots and session metadata](../evidence/usability/README.md)
- [Current primary dashboard evidence](../evidence/dashboard/README.md)
