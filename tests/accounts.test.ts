import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app } from "../server/app.js";
import { pool } from "../server/db/client.js";

const testEmail = `accounts-${randomUUID()}@example.test`;
const testPassword = "BiteBuddy-Test-Password-2026";
let createdUserId: number | undefined;

async function getCsrf(agent: ReturnType<typeof request.agent>): Promise<string> {
  const response = await agent.get("/api/csrf").expect(200);
  expect(response.body.csrfToken).toEqual(expect.any(String));
  return response.body.csrfToken as string;
}

afterAll(async () => {
  if (createdUserId !== undefined) {
    await pool.query('DELETE FROM "session" WHERE sess->>\'userId\' = $1', [
      String(createdUserId),
    ]);
    await pool.query("DELETE FROM users WHERE id = $1", [createdUserId]);
  }
  await pool.end();
});

describe("account flow", () => {
  it("creates an isolated session, logs in, and logs out", async () => {
    const agent = request.agent(app);
    await agent.get("/api/me").expect(401);

    const signupToken = await getCsrf(agent);
    const signup = await agent
      .post("/api/auth/signup")
      .set("x-csrf-token", signupToken)
      .send({ email: `  ${testEmail.toUpperCase()}  `, password: testPassword })
      .expect(201);

    expect(signup.body.user.email).toBe(testEmail);
    expect(signup.body.user.id).toEqual(expect.any(Number));
    expect(signup.body.csrfToken).toEqual(expect.any(String));
    expect(signup.headers["set-cookie"]?.[0]).toContain("HttpOnly");
    expect(signup.headers["set-cookie"]?.[0]).toContain("SameSite=Lax");
    expect(signup.body.user).not.toHaveProperty("passwordHash");
    createdUserId = signup.body.user.id as number;
    const storedPassword = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [createdUserId],
    );
    expect(storedPassword.rows[0].password_hash).not.toBe(testPassword);
    expect(storedPassword.rows[0].password_hash).toMatch(/^\$2[aby]\$12\$/);

    const duplicateSignup = await agent
      .post("/api/auth/signup")
      .set("x-csrf-token", signup.body.csrfToken as string)
      .send({ email: testEmail.toUpperCase(), password: testPassword })
      .expect(409);
    expect(duplicateSignup.body.errors.email).toMatch(
      /may already have an account/i,
    );

    await agent
      .post("/api/auth/logout")
      .set("x-csrf-token", signup.body.csrfToken as string)
      .send({})
      .expect(200);
    await agent.get("/api/me").expect(401);

    const loginToken = await getCsrf(agent);
    const login = await agent
      .post("/api/auth/login")
      .set("x-csrf-token", loginToken)
      .send({ email: testEmail, password: testPassword })
      .expect(200);

    expect(login.body.user.email).toBe(testEmail);
    await agent.get("/api/me").expect(200, {
      user: { id: createdUserId, email: testEmail },
    });

    await agent
      .post("/api/auth/logout")
      .set("x-csrf-token", login.body.csrfToken as string)
      .send({})
      .expect(200);
    await agent.get("/api/me").expect(401);
  });

  it("rejects missing CSRF tokens and invalid account input", async () => {
    const agent = request.agent(app);
    await getCsrf(agent);

    await agent
      .post("/api/auth/signup")
      .send({ email: testEmail, password: testPassword })
      .expect(403);

    const csrfToken = await getCsrf(agent);
    const invalidSignup = await agent
      .post("/api/auth/signup")
      .set("x-csrf-token", csrfToken)
      .send({ email: "not-an-email", password: "short" })
      .expect(400);
    expect(invalidSignup.body.errors).toMatchObject({
      email: "Enter a valid email address.",
      password: "Use at least 12 characters for your password.",
    });

    const longUtf8Email = `utf8-limit-${randomUUID()}@example.test`;
    const longUtf8Password = "😀".repeat(19);
    const longUtf8Response = await agent
      .post("/api/auth/signup")
      .set("x-csrf-token", csrfToken)
      .send({ email: longUtf8Email, password: longUtf8Password })
      .expect(400);
    expect(longUtf8Response.body.errors.password).toMatch(/72 UTF-8 bytes/);
    expect(JSON.stringify(longUtf8Response.body)).not.toContain(
      longUtf8Password,
    );
    const rejectedUser = await pool.query(
      "SELECT count(*)::int AS count FROM users WHERE email = $1",
      [longUtf8Email],
    );
    expect(rejectedUser.rows[0].count).toBe(0);

    await agent
      .post("/api/auth/signup")
      .set("Origin", "https://attacker.invalid")
      .set("x-csrf-token", csrfToken)
      .send({ email: testEmail, password: testPassword })
      .expect(403);
  });

  it("limits repeated failed login attempts", async () => {
    const agent = request.agent(app);
    const csrfToken = await getCsrf(agent);
    const invalidEmail = `missing-${randomUUID()}@example.test`;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await agent
        .post("/api/auth/login")
        .set("x-csrf-token", csrfToken)
        .send({ email: invalidEmail, password: testPassword })
        .expect(401);
    }

    await agent
      .post("/api/auth/login")
      .set("x-csrf-token", csrfToken)
      .send({ email: invalidEmail, password: testPassword })
      .expect(429);
  });
});
