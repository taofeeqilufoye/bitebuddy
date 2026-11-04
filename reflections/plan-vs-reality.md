# Reflection 1 — Plan vs. Reality

The largest gap between the original plan and the finished data model was the rating type. Plan section 3 says restaurant ratings are integers from 1 to 5. The actual five primary restaurant ratings supplied for the journal were 4.6, 4.5, 3.6, 4.2, and 4.3. An integer-only field would have discarded information or changed those values by rounding. Their sum is 21.2; divided by five, the average is 4.24, which the dashboard displays as 4.2.

The prompt history matters when describing who made this decision. I supplied the real ratings and explicitly requested the change in the data-model prompt: “Rating CHANGE requested from actual user entries: accept one decimal 1.0–5.0, rather than the original integer plan.” I was not waiting for an agent to discover the issue after implementation; I asked for decimal support before the schema was built. The Replit Agent implemented the requested database and application rules. The repository prompt log does not preserve a verbatim agent reply proposing a numeric type or discussing PostgreSQL rounding, so I do not repeat the supplied draft’s purported quotation or claim the agent first identified this gap.

The implementation uses PostgreSQL `numeric` and a check constraint that accepts `NULL` or a value from 1.0 to 5.0 in tenths. Client and server validation use the same range and precision. This prevents the database from quietly accepting a value such as 4.56 when the interface supports only tenths. A blank rating remains `NULL`, not zero; zero is not a valid rating. Those details matter because a restaurant without a rating is different from a restaurant rated at the bottom of the scale.

The change affected more than a database column. The form, API validation, database constraint, and dashboard calculation all had to agree. The dashboard now averages only non-null ratings belonging to the signed-in owner and rounds the result to one decimal. The required dashboard test uses two accounts and an unrated entry to verify that the average is 4.0 for ratings 5 and 3, rather than including the blank rating or another user’s data. The required isolation test separately checks that another account cannot see or change an owner’s restaurant.

If I were writing the data requirement again, I would specify the storage range and precision at the start: optional ratings from 1.0 through 5.0, increments of 0.1, blank stored as `NULL`, and invalid precision rejected rather than rounded. I would also state that dashboards average rated entries only and must be owner-scoped. The plan remains intact so this difference is visible, while the schema documentation explains the implemented rule. The lesson is to compare a proposed model with realistic examples before treating the first schema as final, and to describe AI’s role accurately: I supplied the requirement; the agent implemented and checked it.

## Evidence

- [Original integer requirement, PLAN.md §3](../PLAN.md#L28)
- [Exact rating-change prompt and actual checks](../prompts/data-model.md)
- [Implemented schema and constraints](../schema.md)
- [Dashboard RED/GREEN evidence](../test-evidence/README.md#dashboard-average-evidence)
- [Data-model PR #7](https://github.com/taofeeqilufoye/bitebuddy/pull/7) · [Dashboard test PR #32](https://github.com/taofeeqilufoye/bitebuddy/pull/32)
