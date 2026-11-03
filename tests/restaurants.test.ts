import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../server/app.js";
import { pool } from "../server/db/client.js";

const testPassword = "BiteBuddy-Restaurant-Test-2026";
const createdUserIds: number[] = [];

async function getCsrf(agent: ReturnType<typeof request.agent>): Promise<string> {
  const response = await agent.get("/api/csrf").expect(200);
  expect(response.body.csrfToken).toEqual(expect.any(String));
  return response.body.csrfToken as string;
}

async function signUp(
  agent: ReturnType<typeof request.agent>,
  email: string,
): Promise<{ userId: number }> {
  const csrfToken = await getCsrf(agent);
  const response = await agent
    .post("/api/auth/signup")
    .set("x-csrf-token", csrfToken)
    .send({ email, password: testPassword })
    .expect(201);
  const userId = response.body.user.id as number;
  createdUserIds.push(userId);
  return { userId };
}

afterAll(async () => {
  for (const userId of createdUserIds) {
    await pool.query('DELETE FROM "session" WHERE sess->>\'userId\' = $1', [
      String(userId),
    ]);
    await pool.query("DELETE FROM users WHERE id = $1", [userId]);
  }
  await pool.end();
});

describe("authenticated restaurant journal API", () => {
  it("rejects unauthenticated cuisine and restaurant access", async () => {
    const anonymous = request.agent(app);
    const csrfToken = await getCsrf(anonymous);

    await anonymous.get("/api/cuisines").expect(401);
    await anonymous.get("/api/restaurants").expect(401);
    await anonymous.get("/api/restaurants/1").expect(401);
    await anonymous
      .post("/api/restaurants")
      .set("x-csrf-token", csrfToken)
      .send({
        name: "Not saved",
        cuisineId: 1,
        city: null,
        notes: null,
        rating: null,
      })
      .expect(401);
  });

  it("creates, lists, and reads only restaurants owned by each session", async () => {
    const emailA = `restaurant-a-${randomUUID()}@example.test`;
    const emailB = `restaurant-b-${randomUUID()}@example.test`;
    const password = testPassword;
    const agentA = request.agent(app);
    const agentB = request.agent(app);
    const { userId: userIdA } = await signUp(agentA, emailA);
    const { userId: userIdB } = await signUp(agentB, emailB);

    const cuisineResponse = await agentA.get("/api/cuisines").expect(200);
    const thaiCuisine = cuisineResponse.body.cuisines.find(
      (cuisine: { name: string }) => cuisine.name === "Thai",
    ) as { id: number; name: string } | undefined;
    expect(thaiCuisine).toBeDefined();

    const csrfA = await getCsrf(agentA);
    const createdA = await agentA
      .post("/api/restaurants")
      .set("x-csrf-token", csrfA)
      .send({
        name: "  The Ember Table  ",
        cuisineId: thaiCuisine!.id,
        city: "  Portland  ",
        notes: "  A quiet place for noodles.  ",
        rating: 4.5,
        userId: userIdB,
        user_id: userIdB,
        visited: true,
      })
      .expect(201);
    const restaurantAId = createdA.body.restaurant.id as number;
    expect(createdA.body.restaurant).toMatchObject({
      id: restaurantAId,
      cuisineId: thaiCuisine!.id,
      cuisineName: "Thai",
      name: "The Ember Table",
      city: "Portland",
      notes: "A quiet place for noodles.",
      rating: 4.5,
      visited: false,
    });
    expect(createdA.body.restaurant).not.toHaveProperty("userId");

    const nullFields = await agentA
      .post("/api/restaurants")
      .set("x-csrf-token", csrfA)
      .send({
        name: "Sunday Table",
        cuisineId: thaiCuisine!.id,
        city: "",
        notes: "",
        rating: null,
      })
      .expect(201);
    const nullRestaurantId = nullFields.body.restaurant.id as number;
    expect(nullFields.body.restaurant).toMatchObject({
      city: null,
      notes: null,
      rating: null,
      visited: false,
    });

    const csrfB = await getCsrf(agentB);
    const createdB = await agentB
      .post("/api/restaurants")
      .set("x-csrf-token", csrfB)
      .send({
        name: "Harbor Kitchen",
        cuisineId: thaiCuisine!.id,
        city: null,
        notes: null,
        rating: 1,
      })
      .expect(201);
    const restaurantBId = createdB.body.restaurant.id as number;

    const databaseRow = await pool.query<{
      user_id: number;
      visited: boolean;
    }>("SELECT user_id, visited FROM restaurants WHERE id = $1", [
      restaurantAId,
    ]);
    expect(databaseRow.rows[0]).toEqual({ user_id: userIdA, visited: false });

    const listA = await agentA.get("/api/restaurants").expect(200);
    expect(listA.body.restaurants.map((item: { id: number }) => item.id)).toEqual(
      expect.arrayContaining([restaurantAId, nullRestaurantId]),
    );
    expect(
      listA.body.restaurants.some(
        (item: { id: number }) => item.id === restaurantBId,
      ),
    ).toBe(false);

    const listB = await agentB.get("/api/restaurants").expect(200);
    expect(listB.body.restaurants.map((item: { id: number }) => item.id)).toEqual(
      [restaurantBId],
    );

    const ownDetail = await agentA
      .get(`/api/restaurants/${restaurantAId}`)
      .expect(200);
    expect(ownDetail.body.restaurant).toMatchObject({
      id: restaurantAId,
      name: "The Ember Table",
      rating: 4.5,
    });

    const foreignDetail = await agentB
      .get(`/api/restaurants/${restaurantAId}`)
      .expect(404);
    const guessedDetail = await agentB
      .get(`/api/restaurants/${restaurantAId + 1_000_000}`)
      .expect(404);
    expect(foreignDetail.body).toEqual({ message: "Restaurant not found." });
    expect(guessedDetail.body).toEqual(foreignDetail.body);

    const invalidCsrf = await getCsrf(agentA);
    await agentA
      .post("/api/restaurants")
      .set("x-csrf-token", invalidCsrf)
      .send({
        name: "   ",
        cuisineId: thaiCuisine!.id,
        city: null,
        notes: null,
        rating: 3.25,
      })
      .expect(400);

    const overPreciseRating = await agentA
      .post("/api/restaurants")
      .set("x-csrf-token", invalidCsrf)
      .send({
        name: "Too precise",
        cuisineId: thaiCuisine!.id,
        city: null,
        notes: null,
        rating: 1.300000001,
      })
      .expect(400);
    expect(overPreciseRating.body.errors.rating).toContain("one decimal");

    const reauthenticatedA = request.agent(app);
    const loginCsrf = await getCsrf(reauthenticatedA);
    await reauthenticatedA
      .post("/api/auth/login")
      .set("x-csrf-token", loginCsrf)
      .send({ email: emailA, password })
      .expect(200);
    const persistedList = await reauthenticatedA.get("/api/restaurants").expect(200);
    expect(
      persistedList.body.restaurants.map((item: { id: number }) => item.id),
    ).toEqual(expect.arrayContaining([restaurantAId, nullRestaurantId]));
    const persistedNullDetail = await reauthenticatedA
      .get(`/api/restaurants/${nullRestaurantId}`)
      .expect(200);
    expect(persistedNullDetail.body.restaurant).toMatchObject({
      city: null,
      notes: null,
      rating: null,
    });
  });
});
