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
    await anonymous.get("/api/restaurants/starred").expect(401);
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

  it("updates and deletes only owned restaurants and cascades their stars", async () => {
    const emailA = `restaurant-edit-owner-${randomUUID()}@example.test`;
    const emailB = `restaurant-edit-other-${randomUUID()}@example.test`;
    const owner = request.agent(app);
    const otherUser = request.agent(app);
    const { userId: ownerId } = await signUp(owner, emailA);
    const { userId: otherUserId } = await signUp(otherUser, emailB);
    const cuisineResponse = await owner.get("/api/cuisines").expect(200);
    const thai = cuisineResponse.body.cuisines.find(
      (cuisine: { name: string }) => cuisine.name === "Thai",
    ) as { id: number; name: string } | undefined;
    const mexican = cuisineResponse.body.cuisines.find(
      (cuisine: { name: string }) => cuisine.name === "Mexican",
    ) as { id: number; name: string } | undefined;
    expect(thai).toBeDefined();
    expect(mexican).toBeDefined();

    const ownerCsrf = await getCsrf(owner);
    const created = await owner
      .post("/api/restaurants")
      .set("x-csrf-token", ownerCsrf)
      .send({
        name: "Edit test place",
        cuisineId: thai!.id,
        city: "Original City",
        notes: "Original note",
        rating: 3.7,
      })
      .expect(201);
    const restaurantId = created.body.restaurant.id as number;
    const otherCsrf = await getCsrf(otherUser);
    const anonymous = request.agent(app);
    const anonymousCsrf = await getCsrf(anonymous);

    await anonymous
      .patch(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", anonymousCsrf)
      .send({ name: "Anonymous change" })
      .expect(401);
    await anonymous
      .delete(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", anonymousCsrf)
      .expect(401);

    await owner
      .patch(`/api/restaurants/${restaurantId}`)
      .send({ name: "Missing CSRF" })
      .expect(403);
    await owner.delete(`/api/restaurants/${restaurantId}`).expect(403);

    const foreignPatch = await otherUser
      .patch(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", otherCsrf)
      .send({ name: "   " })
      .expect(404);
    const foreignDelete = await otherUser
      .delete(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", otherCsrf)
      .expect(404);
    expect(foreignPatch.body).toEqual({ message: "Restaurant not found." });
    expect(foreignDelete.body).toEqual(foreignPatch.body);

    await owner
      .patch(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", ownerCsrf)
      .send({ name: "   " })
      .expect(400);
    await owner
      .patch(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", ownerCsrf)
      .send({ rating: 4.56 })
      .expect(400);
    await owner
      .patch(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", ownerCsrf)
      .send({ name: "Must not change owner", user_id: otherUserId })
      .expect(400);
    await owner
      .patch(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", ownerCsrf)
      .send({})
      .expect(400);

    const unchanged = await owner
      .get(`/api/restaurants/${restaurantId}`)
      .expect(200);
    expect(unchanged.body.restaurant).toMatchObject({
      name: "Edit test place",
      cuisineName: "Thai",
      city: "Original City",
      notes: "Original note",
      rating: 3.7,
    });

    const oldTimestamp = "2000-01-01T00:00:00.000Z";
    await pool.query(
      "UPDATE restaurants SET updated_at = $1 WHERE id = $2 AND user_id = $3",
      [oldTimestamp, restaurantId, ownerId],
    );
    await pool.query(
      "INSERT INTO stars (user_id, restaurant_id) VALUES ($1, $2)",
      [ownerId, restaurantId],
    );

    const updatedResponse = await owner
      .patch(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", ownerCsrf)
      .send({
        name: "Updated test place",
        cuisineId: mexican!.id,
        city: "  ",
        notes: "",
        rating: 4.6,
      })
      .expect(200);
    const updated = updatedResponse.body.restaurant as {
      name: string;
      cuisineName: string;
      city: string | null;
      notes: string | null;
      rating: number;
      updatedAt: string;
    };
    expect(updated).toMatchObject({
      name: "Updated test place",
      cuisineName: "Mexican",
      city: null,
      notes: null,
      rating: 4.6,
    });
    expect(Date.parse(updated.updatedAt)).toBeGreaterThan(Date.parse(oldTimestamp));
    expect(updatedResponse.body.restaurant).not.toHaveProperty("userId");

    const persistedRow = await pool.query<{
      user_id: number;
      city: string | null;
      notes: string | null;
      rating: string | null;
    }>(
      "SELECT user_id, city, notes, rating::text AS rating FROM restaurants WHERE id = $1",
      [restaurantId],
    );
    expect(persistedRow.rows[0]).toEqual({
      user_id: ownerId,
      city: null,
      notes: null,
      rating: "4.6",
    });

    const reauthenticatedOwner = request.agent(app);
    const loginCsrf = await getCsrf(reauthenticatedOwner);
    await reauthenticatedOwner
      .post("/api/auth/login")
      .set("x-csrf-token", loginCsrf)
      .send({ email: emailA, password: testPassword })
      .expect(200);
    const persistedDetail = await reauthenticatedOwner
      .get(`/api/restaurants/${restaurantId}`)
      .expect(200);
    expect(persistedDetail.body.restaurant).toMatchObject({
      name: "Updated test place",
      cuisineName: "Mexican",
      rating: 4.6,
      city: null,
      notes: null,
    });
    const listAfterUpdate = await owner.get("/api/restaurants").expect(200);
    expect(
      listAfterUpdate.body.restaurants.find(
        (item: { id: number }) => item.id === restaurantId,
      ),
    ).toMatchObject({
      name: "Updated test place",
      cuisineName: "Mexican",
      rating: 4.6,
    });

    const starsBeforeDelete = await pool.query(
      "SELECT count(*)::int AS count FROM stars WHERE user_id = $1 AND restaurant_id = $2",
      [ownerId, restaurantId],
    );
    expect(starsBeforeDelete.rows[0].count).toBe(1);

    await owner
      .delete(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", ownerCsrf)
      .expect(200, { ok: true });
    const restaurantAfterDelete = await pool.query(
      "SELECT count(*)::int AS count FROM restaurants WHERE id = $1 AND user_id = $2",
      [restaurantId, ownerId],
    );
    const starsAfterDelete = await pool.query(
      "SELECT count(*)::int AS count FROM stars WHERE user_id = $1 AND restaurant_id = $2",
      [ownerId, restaurantId],
    );
    expect(restaurantAfterDelete.rows[0].count).toBe(0);
    expect(starsAfterDelete.rows[0].count).toBe(0);
    const listAfterDelete = await owner.get("/api/restaurants").expect(200);
    expect(
      listAfterDelete.body.restaurants.some(
        (item: { id: number }) => item.id === restaurantId,
      ),
    ).toBe(false);
    await owner
      .delete(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", ownerCsrf)
      .expect(404, { message: "Restaurant not found." });
  });

  it("stars only owned restaurants, is idempotent, persists, and cascades on delete", async () => {
    const ownerEmail = `star-owner-${randomUUID()}@example.test`;
    const otherEmail = `star-other-${randomUUID()}@example.test`;
    const owner = request.agent(app);
    const otherUser = request.agent(app);
    const { userId: ownerId } = await signUp(owner, ownerEmail);
    await signUp(otherUser, otherEmail);
    const cuisinesResponse = await owner.get("/api/cuisines").expect(200);
    const thai = cuisinesResponse.body.cuisines.find(
      (cuisine: { name: string }) => cuisine.name === "Thai",
    ) as { id: number } | undefined;
    expect(thai).toBeDefined();

    const ownerCsrf = await getCsrf(owner);
    const otherCsrf = await getCsrf(otherUser);
    const anonymous = request.agent(app);
    const anonymousCsrf = await getCsrf(anonymous);
    const created = await owner
      .post("/api/restaurants")
      .set("x-csrf-token", ownerCsrf)
      .send({
        name: "Star lifecycle fixture",
        cuisineId: thai!.id,
        city: null,
        notes: null,
        rating: null,
      })
      .expect(201);
    const restaurantId = created.body.restaurant.id as number;
    const starPath = `/api/restaurants/${restaurantId}/star`;

    await anonymous
      .put(starPath)
      .set("x-csrf-token", anonymousCsrf)
      .expect(401);
    await owner.put(starPath).expect(403);
    const foreignStar = await otherUser
      .put(starPath)
      .set("x-csrf-token", otherCsrf)
      .expect(404);
    const foreignUnstar = await otherUser
      .delete(starPath)
      .set("x-csrf-token", otherCsrf)
      .expect(404);
    expect(foreignStar.body).toEqual({ message: "Restaurant not found." });
    expect(foreignUnstar.body).toEqual(foreignStar.body);
    await otherUser.get("/api/restaurants/starred").expect(200, {
      restaurants: [],
    });

    await owner.put(starPath).set("x-csrf-token", ownerCsrf).expect(200, {
      isStarred: true,
    });
    await owner.put(starPath).set("x-csrf-token", ownerCsrf).expect(200, {
      isStarred: true,
    });
    const starredCount = await pool.query(
      "SELECT count(*)::int AS count FROM stars WHERE user_id = $1 AND restaurant_id = $2",
      [ownerId, restaurantId],
    );
    expect(starredCount.rows[0].count).toBe(1);

    const starredCollection = await owner
      .get("/api/restaurants/starred")
      .expect(200);
    expect(starredCollection.body.restaurants).toHaveLength(1);
    expect(starredCollection.body.restaurants[0]).toMatchObject({
      id: restaurantId,
      isStarred: true,
    });
    const regularCollection = await owner.get("/api/restaurants").expect(200);
    expect(
      regularCollection.body.restaurants.find(
        (restaurant: { id: number }) => restaurant.id === restaurantId,
      ),
    ).toMatchObject({ isStarred: true });

    await owner
      .post("/api/auth/logout")
      .set("x-csrf-token", ownerCsrf)
      .send({})
      .expect(200);
    const reauthenticatedOwner = request.agent(app);
    const loginCsrf = await getCsrf(reauthenticatedOwner);
    const loginResponse = await reauthenticatedOwner
      .post("/api/auth/login")
      .set("x-csrf-token", loginCsrf)
      .send({ email: ownerEmail, password: testPassword })
      .expect(200);
    const reauthenticatedCsrf = loginResponse.body.csrfToken as string;
    const persistedStar = await reauthenticatedOwner
      .get("/api/restaurants/starred")
      .expect(200);
    expect(persistedStar.body.restaurants[0]).toMatchObject({
      id: restaurantId,
      isStarred: true,
    });

    await reauthenticatedOwner
      .delete(starPath)
      .set("x-csrf-token", reauthenticatedCsrf)
      .expect(200, { isStarred: false });
    await reauthenticatedOwner
      .delete(starPath)
      .set("x-csrf-token", reauthenticatedCsrf)
      .expect(200, { isStarred: false });
    const emptyStarredView = await reauthenticatedOwner
      .get("/api/restaurants/starred")
      .expect(200);
    expect(emptyStarredView.body.restaurants).toEqual([]);
    const unstarredRestaurant = await reauthenticatedOwner
      .get(`/api/restaurants/${restaurantId}`)
      .expect(200);
    expect(unstarredRestaurant.body.restaurant.isStarred).toBe(false);

    await reauthenticatedOwner
      .put(starPath)
      .set("x-csrf-token", reauthenticatedCsrf)
      .expect(200, { isStarred: true });
    await reauthenticatedOwner
      .delete(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", reauthenticatedCsrf)
      .expect(200, { ok: true });
    const starsAfterRestaurantDelete = await pool.query(
      "SELECT count(*)::int AS count FROM stars WHERE user_id = $1 AND restaurant_id = $2",
      [ownerId, restaurantId],
    );
    expect(starsAfterRestaurantDelete.rows[0].count).toBe(0);
  });

  it("blocks invalid create and edit inputs without storing or changing rows", async () => {
    const email = `restaurant-validation-${randomUUID()}@example.test`;
    const owner = request.agent(app);
    const { userId } = await signUp(owner, email);
    const cuisines = await owner.get("/api/cuisines").expect(200);
    const thai = cuisines.body.cuisines.find(
      (cuisine: { name: string }) => cuisine.name === "Thai",
    ) as { id: number } | undefined;
    expect(thai).toBeDefined();
    const csrfToken = await getCsrf(owner);
    const validInput = {
      name: "Validation fixture",
      cuisineId: thai!.id,
      city: null,
      notes: null,
      rating: null,
    };
    const invalidCreates: Array<{
      field: string;
      input: Record<string, unknown>;
    }> = [
      { field: "name", input: { ...validInput, name: "   " } },
      { field: "name", input: { ...validInput, name: "n".repeat(201) } },
      {
        field: "cuisineId",
        input: { ...validInput, cuisineId: undefined },
      },
      {
        field: "cuisineId",
        input: { ...validInput, cuisineId: 2_147_483_647 },
      },
      { field: "city", input: { ...validInput, city: "c".repeat(121) } },
      { field: "notes", input: { ...validInput, notes: "n".repeat(5_001) } },
      { field: "rating", input: { ...validInput, rating: 0.9 } },
      { field: "rating", input: { ...validInput, rating: 5.1 } },
      { field: "rating", input: { ...validInput, rating: 4.56 } },
    ];

    for (const invalid of invalidCreates) {
      const response = await owner
        .post("/api/restaurants")
        .set("x-csrf-token", csrfToken)
        .send(invalid.input)
        .expect(400);
      expect(response.body.errors[invalid.field]).toEqual(expect.any(String));
    }

    const countAfterInvalidCreates = await pool.query(
      "SELECT count(*)::int AS count FROM restaurants WHERE user_id = $1",
      [userId],
    );
    expect(countAfterInvalidCreates.rows[0].count).toBe(0);
    await owner.get("/api/restaurants").expect(200, { restaurants: [] });

    const created = await owner
      .post("/api/restaurants")
      .set("x-csrf-token", csrfToken)
      .send({
        ...validInput,
        city: "",
        notes: " ",
        rating: 4.6,
      })
      .expect(201);
    const restaurantId = created.body.restaurant.id as number;
    expect(created.body.restaurant).toMatchObject({
      name: validInput.name,
      city: null,
      notes: null,
      rating: 4.6,
    });
    const createdWithoutRating = await owner
      .post("/api/restaurants")
      .set("x-csrf-token", csrfToken)
      .send({
        ...validInput,
        name: "Blank rating create fixture",
        rating: null,
      })
      .expect(201);
    expect(createdWithoutRating.body.restaurant.rating).toBeNull();
    const listAfterValidCreates = await owner.get("/api/restaurants").expect(200);
    expect(listAfterValidCreates.body.restaurants).toHaveLength(2);
    const originalDetail = await owner
      .get(`/api/restaurants/${restaurantId}`)
      .expect(200);

    const invalidUpdates: Array<{
      field: string;
      input: Record<string, unknown>;
    }> = [
      { field: "name", input: { name: "  " } },
      { field: "name", input: { name: "u".repeat(201) } },
      { field: "cuisineId", input: { cuisineId: 2_147_483_647 } },
      { field: "city", input: { city: "c".repeat(121) } },
      { field: "notes", input: { notes: "n".repeat(5_001) } },
      { field: "rating", input: { rating: 4.56 } },
      { field: "rating", input: { rating: 0.9 } },
      { field: "rating", input: { rating: 5.1 } },
    ];

    for (const invalid of invalidUpdates) {
      const response = await owner
        .patch(`/api/restaurants/${restaurantId}`)
        .set("x-csrf-token", csrfToken)
        .send(invalid.input)
        .expect(400);
      expect(response.body.errors[invalid.field]).toEqual(expect.any(String));
    }

    const unchangedDetail = await owner
      .get(`/api/restaurants/${restaurantId}`)
      .expect(200);
    expect(unchangedDetail.body.restaurant).toEqual(
      originalDetail.body.restaurant,
    );

    const updated = await owner
      .patch(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", csrfToken)
      .send({
        name: "Validated edit fixture",
        city: "",
        notes: " ",
        rating: 4.5,
      })
      .expect(200);
    expect(updated.body.restaurant).toMatchObject({
      name: "Validated edit fixture",
      city: null,
      notes: null,
      rating: 4.5,
    });

    const clearedRating = await owner
      .patch(`/api/restaurants/${restaurantId}`)
      .set("x-csrf-token", csrfToken)
      .send({ rating: null })
      .expect(200);
    expect(clearedRating.body.restaurant.rating).toBeNull();
  });
});
