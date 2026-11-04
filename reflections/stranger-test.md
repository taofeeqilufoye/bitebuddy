# Reflection 2 — The Stranger Test

On November 3, I had two people outside my class try BiteBuddy. They created their own accounts and used it for about twelve and fourteen minutes while I watched without helping. What stood out was that their feedback was mostly about choices I had stopped noticing. I knew what each control was supposed to mean, but they were seeing the app without that background.

The first major issue was the cuisine list. User B pointed out that it was not exhaustive and needed an “Other” option. I had treated a list of sixteen cuisines as enough for a simple restaurant journal. Their comment exposed the assumption behind that decision: I had designed categories around the restaurants already in my collection, rather than everyone else’s possible entries. Even a small app needs a way to handle information that does not fit its first examples.

The second issue was password entry. User A wanted an eye button to check the password while typing, which is a familiar feature on other sites. The app could create an account and protect the password correctly, but the form still missed something they expected. It helped me separate security from usability. Hashing protects the stored password; a visibility button helps someone check the text they are currently entering. Having the first does not remove the usefulness of the second.

The third issue was the saved-restaurant controls. User A questioned why a restaurant they had already added still showed “Want to try” and “Star.” In the app, saving a restaurant, marking it visited, and making it a favorite are separate actions. That made sense in the database, but the interface did not make the distinction equally clear. I could explain why the controls were there, but needing that explanation was itself useful feedback. User B also noticed that the rating helper looked disconnected from the Notes field, which reinforced the same point about wording and placement.

I went with the cuisine issue for the required fix because it affected the app’s basic purpose: recording a restaurant accurately. Issue #29 and PR #33 added “Other” to the existing category list. The change stayed small and worked through the current forms, filters, and dashboard instead of introducing a separate custom-category feature. Checks covered creating and editing entries with the new category, filtering them, and counting them correctly. The option was also checked on the live app.

I left the password eye button, clearer status/favorite labels, and helper wording for later. That was a scope decision, not a conclusion that those comments were unimportant. I wanted to finish one observed problem properly rather than turn the final stage into another round of features. I would keep those concerns for the next usability pass.

The biggest lesson for me was that functional completeness and clarity are different things. The automated tests checked ownership and calculations, but they could not tell me whether someone understood a button. Watching people use the app without explaining it gave me information I could not get by checking whether the features technically worked.
## Evidence

- [Usability observations and screenshots](https://github.com/taofeeqilufoye/bitebuddy/blob/main/evidence/usability/README.md)
- [Issue #29](https://github.com/taofeeqilufoye/bitebuddy/issues/29) and [completed fix, PR #33](https://github.com/taofeeqilufoye/bitebuddy/pull/33)
- [Fix prompt and verification results](https://github.com/taofeeqilufoye/bitebuddy/blob/main/prompts/usability-other-cuisine.md)
