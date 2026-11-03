import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { afterAll, describe, expect, it } from "vitest";
import { pool } from "../server/db/client.js";
import { CUISINE_LABELS, seedCuisineLabels } from "../server/db/cuisine-seed.js";
import * as schema from "../server/db/schema.js";

async function expectConstraintFailure(
  client: PoolClient,
  code: string,
  statement: () => Promise<unknown>,
): Promise<void> {
  await client.query("SAVEPOINT constraint_probe");
  let failure: unknown;

  try {
    await statement();
  } catch (error) {
    failure = error;
  }

  await client.query("ROLLBACK TO SAVEPOINT constraint_probe");
  await client.query("RELEASE SAVEPOINT constraint_probe");
  expect(failure).toMatchObject({ code });
}

describe("related data database constraints", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("seeds the shared cuisine labels idempotently", async () => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        `CREATE TEMP TABLE cuisines (
          id serial PRIMARY KEY,
          name text NOT NULL UNIQUE
        ) ON COMMIT DROP`,
      );
      const testDatabase = drizzle(client, { schema });

      await seedCuisineLabels(testDatabase);
      await seedCuisineLabels(testDatabase);

      const result = await client.query<{ name: string; count: string }>(
        `SELECT name, count(*) OVER (PARTITION BY name)::text AS count
         FROM cuisines
         ORDER BY name`,
      );
      expect(result.rows.map((row) => row.name)).toEqual(
        [...CUISINE_LABELS].sort(),
      );
      expect(result.rows.every((row) => row.count === "1")).toBe(true);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("enforces cuisine, restaurant, and owned-star relationships", async () => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const firstUser = await client.query<{ id: number }>(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, 'test-only-hash')
         RETURNING id`,
        [`data-model-a-${randomUUID()}@example.test`],
      );
      const secondUser = await client.query<{ id: number }>(
        `INSERT INTO users (email, password_hash)
         VALUES ($1, 'test-only-hash')
         RETURNING id`,
        [`data-model-b-${randomUUID()}@example.test`],
      );
      const userId = firstUser.rows[0]!.id;
      const otherUserId = secondUser.rows[0]!.id;

      const expectedCuisines = [
        "Colombian",
        "Dominican",
        "Nigerian",
        "Thai",
      ];
      const seededCuisines = await client.query<{ name: string }>(
        "SELECT name FROM cuisines WHERE name = ANY($1::text[])",
        [expectedCuisines],
      );
      expect(seededCuisines.rows.map((row) => row.name).sort()).toEqual(
        [...expectedCuisines].sort(),
      );
      const cuisine = await client.query<{ id: number }>(
        "SELECT id FROM cuisines WHERE name = $1",
        ["Thai"],
      );
      const cuisineId = cuisine.rows[0]!.id;

      const restaurant = await client.query<{
        id: number;
        rating: string;
        visited: boolean;
        city: string | null;
        notes: string | null;
      }>(
        `INSERT INTO restaurants (user_id, cuisine_id, name, rating)
         VALUES ($1, $2, $3, $4)
         RETURNING id, rating, visited, city, notes`,
        [userId, cuisineId, "Temporary database constraint check", 4.5],
      );
      const restaurantRow = restaurant.rows[0]!;
      const restaurantId = restaurantRow.id;
      expect(Number(restaurantRow.rating)).toBe(4.5);
      expect(restaurantRow.visited).toBe(false);
      expect(restaurantRow.city).toBeNull();
      expect(restaurantRow.notes).toBeNull();

      await client.query(
        "INSERT INTO stars (user_id, restaurant_id) VALUES ($1, $2)",
        [userId, restaurantId],
      );

      await expectConstraintFailure(client, "23505", () =>
        client.query(
          "INSERT INTO stars (user_id, restaurant_id) VALUES ($1, $2)",
          [userId, restaurantId],
        ),
      );
      await expectConstraintFailure(client, "23503", () =>
        client.query(
          "INSERT INTO stars (user_id, restaurant_id) VALUES ($1, $2)",
          [otherUserId, restaurantId],
        ),
      );
      await expectConstraintFailure(client, "23514", () =>
        client.query(
          `INSERT INTO restaurants (user_id, cuisine_id, name)
           VALUES ($1, $2, $3)`,
          [userId, cuisineId, "   \t"],
        ),
      );

      for (const invalidRating of [0.9, 5.1, 3.25]) {
        await expectConstraintFailure(client, "23514", () =>
          client.query(
            `INSERT INTO restaurants (user_id, cuisine_id, name, rating)
             VALUES ($1, $2, $3, $4)`,
            [userId, cuisineId, `Invalid rating ${invalidRating}`, invalidRating],
          ),
        );
      }

      await expectConstraintFailure(client, "23503", () =>
        client.query(
          `INSERT INTO restaurants (user_id, cuisine_id, name)
           VALUES ($1, $2, $3)`,
          [userId, 2_000_000_000, "Missing cuisine"],
        ),
      );
      await expectConstraintFailure(client, "23503", () =>
        client.query(
          `INSERT INTO restaurants (user_id, cuisine_id, name)
           VALUES ($1, $2, $3)`,
          [2_000_000_000, cuisineId, "Missing user"],
        ),
      );

      await client.query("DELETE FROM restaurants WHERE id = $1", [
        restaurantId,
      ]);
      const remainingStars = await client.query<{ count: string }>(
        "SELECT count(*) FROM stars WHERE user_id = $1 AND restaurant_id = $2",
        [userId, restaurantId],
      );
      expect(Number(remainingStars.rows[0]!.count)).toBe(0);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });
});
