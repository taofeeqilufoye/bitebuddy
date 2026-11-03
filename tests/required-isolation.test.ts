import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../server/app.js";
import { pool } from "../server/db/client.js";

const testPassword = "BiteBuddy-Isolation-Test-2026!";
const fixtureEmails = [
  `isolation-owner-${randomUUID()}@example.test`,
  `isolation-other-${randomUUID()}@example.test`,
];
let confirmedDevelopmentDatabase = false;

async function getCsrf(agent: ReturnType<typeof request.agent>): Promise<string> {
  const response = await agent.get("/api/csrf").expect(200);
  expect(response.body.csrfToken).toEqual(expect.any(String));
  return response.body.csrfToken as string;
}

async function signUp(
  agent: ReturnType<typeof request.agent>,
  email: string,
): Promise<{ userId: number; csrfToken: string }> {
  const initialCsrfToken = await getCsrf(agent);
  const response = await agent
    .post("/api/auth/signup")
    .set("x-csrf-token", initialCsrfToken)
    .send({ email, password: testPassword })
    .expect(201);
  return {
    userId: response.body.user.id as number,
    csrfToken: response.body.csrfToken as string,
  };
}

beforeAll(async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run isolation tests in production.");
  }

  // The Replit development database was confirmed as heliumdb and not a read replica.
  const result = await pool.query<{
    database_name: string;
    is_read_replica: boolean;
  }>(
    "SELECT current_database() AS database_name, pg_is_in_recovery() AS is_read_replica",
  );
  const database = result.rows[0];
  if (
    database?.database_name !== "heliumdb" ||
    database.is_read_replica !== false
  ) {
    throw new Error(
      "Refusing to run isolation tests outside the confirmed Replit development database.",
    );
  }

  confirmedDevelopmentDatabase = true;
});

afterAll(async () => {
  try {
    if (!confirmedDevelopmentDatabase) return;

    await pool.query(
      `DELETE FROM "session"
       WHERE sess->>'userId' IN (
         SELECT id::text FROM users WHERE email = ANY($1::text[])
       )`,
      [fixtureEmails],
    );
    await pool.query("DELETE FROM users WHERE email = ANY($1::text[])", [
      fixtureEmails,
    ]);
  } finally {
    await pool.end();
  }
});

describe("required restaurant data isolation", () => {
  it("keeps another account from listing, reading, or changing the owner's restaurant", async () => {
    const agentA = request.agent(app);
    const agentB = request.agent(app);
    const { userId: userIdA, csrfToken: csrfA } = await signUp(
      agentA,
      fixtureEmails[0]!,
    );
    const { csrfToken: csrfB } = await signUp(agentB, fixtureEmails[1]!);

    const cuisineResponse = await agentA.get("/api/cuisines").expect(200);
    const thai = cuisineResponse.body.cuisines.find(
      (cuisine: { name: string }) => cuisine.name === "Thai",
    ) as { id: number } | undefined;
    expect(thai).toBeDefined();

    const created = await agentA
      .post("/api/restaurants")
      .set("x-csrf-token", csrfA)
      .send({
        name: "Isolation A private fixture",
        cuisineId: thai!.id,
        city: "Testville",
        notes: "Disposable owner-isolation fixture.",
        rating: 4.6,
      })
      .expect(201);
    const restaurantId = created.body.restaurant.id as number;
    const visitedPath = `/api/restaurants/${restaurantId}/visited`;
    const starPath = `/api/restaurants/${restaurantId}/star`;
    const detailPath = `/api/restaurants/${restaurantId}`;

    await agentA
      .put(visitedPath)
      .set("x-csrf-token", csrfA)
      .send({ visited: true })
      .expect(200, { visited: true });
    await agentA
      .put(starPath)
      .set("x-csrf-token", csrfA)
      .expect(200, { isStarred: true });

    const ownerList = await agentA.get("/api/restaurants").expect(200);
    expect(
      ownerList.body.restaurants.some(
        (restaurant: { id: number }) => restaurant.id === restaurantId,
      ),
    ).toBe(true);

    const otherList = await agentB.get("/api/restaurants").expect(200);
    expect(
      otherList.body.restaurants.some(
        (restaurant: { id: number }) => restaurant.id === restaurantId,
      ),
    ).toBe(false);
    await agentB.get("/api/restaurants/starred").expect(200, {
      restaurants: [],
    });
    await agentB
      .get(detailPath)
      .expect(404, { message: "Restaurant not found." });

    await agentB
      .patch(detailPath)
      .set("x-csrf-token", csrfB)
      .send({
        name: "Changed by B",
        cuisineId: thai!.id,
        city: "Other City",
        notes: "Attempted cross-account edit.",
        rating: 1.2,
      })
      .expect(404, { message: "Restaurant not found." });
    await agentB
      .delete(detailPath)
      .set("x-csrf-token", csrfB)
      .expect(404, { message: "Restaurant not found." });
    await agentB
      .put(starPath)
      .set("x-csrf-token", csrfB)
      .expect(404, { message: "Restaurant not found." });
    await agentB
      .delete(starPath)
      .set("x-csrf-token", csrfB)
      .expect(404, { message: "Restaurant not found." });
    await agentB
      .put(visitedPath)
      .set("x-csrf-token", csrfB)
      .send({ visited: false })
      .expect(404, { message: "Restaurant not found." });

    await agentB.get("/api/dashboard").expect(200, {
      totalSaved: 0,
      visitedCount: 0,
      averageRating: null,
      cuisineCounts: [],
    });

    const ownerRow = await pool.query<{
      user_id: number;
      name: string;
      city: string | null;
      notes: string | null;
      rating: string | null;
      visited: boolean;
    }>(
      `SELECT user_id, name, city, notes, rating::text AS rating, visited
       FROM restaurants WHERE id = $1`,
      [restaurantId],
    );
    expect(ownerRow.rows[0]).toEqual({
      user_id: userIdA,
      name: "Isolation A private fixture",
      city: "Testville",
      notes: "Disposable owner-isolation fixture.",
      rating: "4.6",
      visited: true,
    });

    const ownerStar = await pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM stars WHERE user_id = $1 AND restaurant_id = $2",
      [userIdA, restaurantId],
    );
    expect(ownerStar.rows[0].count).toBe(1);
  });
});
