# Usability evidence

## Observed sessions

- Two people outside the class, labeled **A** and **B**, created their own accounts and were observed unaided on November 3, 2026.
- The reported session durations were approximately 12 and 14 minutes. The source record does not map a duration to A or B.
- No names are recorded. The observations below are limited to the four reported concerns.

## Four reported concerns

1. **B — cuisine list:** “the cusine list should include other since the list is not exhaustive”. The pre-fix list had 16 fixed cuisine choices. No failed save was reported.
2. **A — password entry:** A expected a control to reveal the password currently being typed. The supplied eye-button reference is from another interface, not BiteBuddy.
3. **A — saved-place controls:** A questioned why a saved restaurant still showed separate Want to try and star actions. This concerned the clarity of the status/favorite choices.
4. **B — rating helper:** B found the placement of “A personal note to yourself, not a scorecard” above Notes confusing.

## Selected change and later verification

Issue #29 and [PR #33](https://github.com/taofeeqilufoye/bitebuddy/pull/33) add `Other` to the existing repeat-safe shared cuisine seed. This is a fallback label, not a custom-category editor; restaurant schema and saved relationships were unchanged.

After the fix, the supervising assistant reported selecting `Other` in the live form, canceling without saving, and confirming the primary dashboard remained at 5 saved, 5 visited, and average 4.2. A separate supervising-assistant development check selected `Other` in the actual create form. Its first login attempt was during a workflow restart; login succeeded after reload. These checks were not performed by A or B, and no post-fix tester session is claimed.

## Original evidence links

- [A — status controls](./A-status-controls.png)
- [A — password field](./A-password-field.png)
- [A — password-eye reference from another interface](./A-password-eye-reference.png)
- [B — cuisine list before the fix](./B-cuisine-list.png)
- [B — rating helper and Notes placement](./B-rating-notes-hint.png)
- [Live — Other selected after PR #33](./Other-cuisine-live.jpg)
