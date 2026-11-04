# Reflection 1 — Plan vs. Reality

The biggest difference between my original plan and the finished project was how much work sat between building the features and making them work reliably on the live app. My plan was specific about what BiteBuddy should do: save restaurants, keep accounts separate, support favorites, and show a dashboard. I also included deployment after each feature. What I underestimated was that publishing would involve more than putting the working preview online.

That became clear around the database. I had planned the tables and their relationships, but creating them in development did not mean the live application automatically had everything it needed. Development and production had separate databases. The application needed the same structure in both, while keeping their actual user records separate. Shared cuisine categories also had to exist in production before someone could save a restaurant.

A follow-up prompt made that missing detail explicit: “report exactly how its tracked migration and cuisine labels will reach the existing Replit production database on republish.” The response explained that publishing compared the database structures, but did not copy development records or category data. The implementation therefore added a small startup step that inserts missing cuisine labels without duplicating them. It does not create restaurants or copy users’ journals.

Honestly, this changed how I understood the database part of the project. I had been thinking of the database mainly as the place where the app saved information. I now had to think about which database the app was using, what should be shared between environments, and what should stay separate. A cuisine label like “Thai” is shared reference information. My rating and notes about a Thai restaurant belong to my account. Both are data, but they should not be handled the same way during deployment.

The production-startup fix in PR #7 and the database work in PR #12 show where the plan needed more detail. I had chosen Replit to keep development, storage, and hosting together. The agent worked out the technical setup within that choice. The cost was additional configuration, verification, and a separate startup-fix PR before continuing with the restaurant features. It did not change the purpose of the app, but it showed that infrastructure work could interrupt an otherwise straightforward feature sequence.

The dashboard gave me another useful way to check the result. My five actual ratings total 21.2, so the average should display as 4.2. Seeing the right number mattered more once I understood that it had to come from the correct account’s records in the live database. The chart and statistics were not just presentation; they were a way to check whether the parts behind the page agreed.

If I rewrote the deployment section, I would say: “Keep development and production data separate. Configure the production build and startup commands explicitly. Explain how schema changes reach production, insert shared cuisine labels without duplicates, and verify the live account’s data after publishing. Never copy test users or restaurant records into production.”

My main lesson is that a feature is not finished just because it works in Preview. It also needs to start correctly, use the right data, and behave the same way when someone opens the published URL.

## Evidence

- [Original technology and hosting plan](https://github.com/taofeeqilufoye/bitebuddy/blob/main/PLAN.md#L49)
- [Production-startup fix, PR #7](https://github.com/taofeeqilufoye/bitebuddy/pull/7)
- [Database implementation, PR #12](https://github.com/taofeeqilufoye/bitebuddy/pull/12)
- [Deployment prompt and recorded response](https://github.com/taofeeqilufoye/bitebuddy/blob/main/prompts/data-model.md)
- [Live dashboard with my five real entries](https://github.com/taofeeqilufoye/bitebuddy/blob/main/evidence/dashboard/own-dashboard.jpg)
