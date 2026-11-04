import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../server/app.js";
import { pool } from "../server/db/client.js";

const testPassword = "BiteBuddy-Dashboard-Test-2026!";
const fixtureEmails = [
  `dashboard-owner-${randomUUID()}@example.test`,
  `dashboard-other-${randomUUID()}@example.test`,
  `dashboard-empty-${randomUUID()}@example.test`,
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
): Promise<string> {
  const initialCsrfToken = await getCsrf(agent);
  const response = await agent
    .post("/api/auth/signup")
    .set("x-csrf-token", initialCsrfToken)
    .send({ email, password: testPassword })
    .expect(201);
  return response.body.csrfToken as string;
}

async function createRestaurant(
  agent: ReturnType<typeof request.agent>,
  csrfToken: string,
  cuisineId: number,
  name: string,
  rating: number | null,
): Promise<number> {
  const response = await agent
    .post("/api/restaurants")
    .set("x-csrf-token", csrfToken)
    .send({
      name,
      cuisineId,
      city: null,
      notes: null,
      rating,
    })
    .expect(201);
  return response.body.restaurant.id as number;
}

beforeAll(async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to run dashboard tests in production.");
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
      "Refusing to run dashboard tests outside the confirmed Replit development database.",
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

describe("required dashboard average", () => {
  it("averages only the signed-in account's rated restaurants and handles empty accounts", async () => {
    const agentA = request.agent(app);
    const agentB = request.agent(app);
    const emptyAgent = request.agent(app);
    const csrfA = await signUp(agentA, fixtureEmails[0]!);
    const csrfB = await signUp(agentB, fixtureEmails[1]!);
    await signUp(emptyAgent, fixtureEmails[2]!);

    const cuisineResponse = await agentA.get("/api/cuisines").expect(200);
    const thai = cuisineResponse.body.cuisines.find(
      (cuisine: { name: string }) => cuisine.name === "Thai",
    ) as { id: number } | undefined;
    expect(thai).toBeDefined();

    const fiveStarId = await createRestaurant(
      agentA,
      csrfA,
      thai!.id,
      "Dashboard test five-star fixture",
      5,
    );
    await createRestaurant(
      agentA,
      csrfA,
      thai!.id,
      "Dashboard test three-star fixture",
      3,
    );
    await createRestaurant(
      agentA,
      csrfA,
      thai!.id,
      "Dashboard test unrated fixture",
      null,
    );
    await agentA
      .put(`/api/restaurants/${fiveStarId}/visited`)
      .set("x-csrf-token", csrfA)
      .send({ visited: true })
      .expect(200, { visited: true });

    await createRestaurant(
      agentB,
      csrfB,
      thai!.id,
      "Dashboard test other-account fixture",
      1,
    );

    const dashboardA = await agentA.get("/api/dashboard").expect(200);
    expect(dashboardA.body).toEqual({
      totalSaved: 3,
      visitedCount: 1,
      averageRating: 4,
      cuisineCounts: [{ cuisineId: thai!.id, cuisineName: "Thai", count: 3 }],
    });

    const dashboardB = await agentB.get("/api/dashboard").expect(200);
    expect(dashboardB.body).toEqual({
      totalSaved: 1,
      visitedCount: 0,
      averageRating: 1,
      cuisineCounts: [{ cuisineId: thai!.id, cuisineName: "Thai", count: 1 }],
    });

    const emptyDashboard = await emptyAgent.get("/api/dashboard").expect(200);
    expect(emptyDashboard.body).toEqual({
      totalSaved: 0,
      visitedCount: 0,
      averageRating: null,
      cuisineCounts: [],
    });
  });
});
