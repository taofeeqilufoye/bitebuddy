import bcrypt from "bcryptjs";
import connectPgSimple from "connect-pg-simple";
import { randomBytes, timingSafeEqual } from "node:crypto";
import express from "express";
import type { ErrorRequestHandler, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import path from "node:path";
import { z } from "zod";
import { db, pool } from "./db/client.js";
import { cuisines, restaurants, stars, users } from "./db/schema.js";
import {
  loginSchema,
  restaurantInputSchema,
  restaurantUpdateSchema,
  signupSchema,
} from "./validation.js";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET must be set in Replit Secrets.");
}

const isProduction = process.env.NODE_ENV === "production";
const sessionCookieName = "bitebuddy.sid";
const PostgresSessionStore = connectPgSimple(session);
const dummyPasswordHash = bcrypt.hash(randomBytes(32).toString("hex"), 12);

export const app = express();

if (isProduction) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(
  session({
    name: sessionCookieName,
    store: new PostgresSessionStore({
      pool,
      tableName: "session",
      createTableIfMissing: false,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: isProduction,
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    },
  }),
);

function newCsrfToken(): string {
  return randomBytes(32).toString("hex");
}

function isUniqueViolation(error: unknown): boolean {
  let current = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (typeof current !== "object" || current === null) return false;
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

function sendValidationError(
  res: Response,
  issues: z.ZodIssue[],
): void {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if ((field === "email" || field === "password") && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  res.status(400).json({ message: "Check the highlighted fields.", errors });
}

function requireJson(req: Request, res: Response, next: () => void): void {
  if (!req.is("application/json")) {
    res.status(415).json({ message: "Send this request as JSON." });
    return;
  }
  next();
}

function requireAuthenticated(
  req: Request,
  res: Response,
  next: () => void,
): void {
  if (!req.session.userId) {
    res.status(401).json({ message: "Sign in to continue." });
    return;
  }
  next();
}

function requireCsrf(req: Request, res: Response, next: () => void): void {
  const expected = req.session.csrfToken;
  const received = req.get("x-csrf-token");
  if (!expected || !received) {
    res.status(403).json({ message: "Your security token is missing or expired. Refresh and try again." });
    return;
  }

  const expectedBytes = Buffer.from(expected, "utf8");
  const receivedBytes = Buffer.from(received, "utf8");
  if (
    expectedBytes.length !== receivedBytes.length ||
    !timingSafeEqual(expectedBytes, receivedBytes)
  ) {
    res.status(403).json({ message: "Your security token is invalid. Refresh and try again." });
    return;
  }

  const origin = req.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host.toLowerCase() !== req.get("host")?.toLowerCase()) {
        res.status(403).json({ message: "This request did not come from BiteBuddy." });
        return;
      }
    } catch {
      res.status(403).json({ message: "This request did not come from BiteBuddy." });
      return;
    }
  }

  next();
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many login attempts. Wait 15 minutes, then try again." },
});

async function establishSession(
  req: Request,
  res: Response,
  user: { id: number; email: string },
  statusCode: number,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });

  req.session.userId = user.id;
  req.session.csrfToken = newCsrfToken();
  await new Promise<void>((resolve, reject) => {
    req.session.save((error) => (error ? reject(error) : resolve()));
  });

  res.status(statusCode).json({ user, csrfToken: req.session.csrfToken });
}

app.get("/api/csrf", (req, res) => {
  req.session.csrfToken ??= newCsrfToken();
  res.setHeader("Cache-Control", "no-store");
  res.json({ csrfToken: req.session.csrfToken });
});

app.get("/api/me", async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({ message: "Sign in to continue." });
    return;
  }

  const [user] = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.id, req.session.userId))
    .limit(1);

  if (!user) {
    req.session.destroy(() => undefined);
    res.status(401).json({ message: "Sign in to continue." });
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.json({ user });
});

app.post(
  "/api/auth/signup",
  requireJson,
  requireCsrf,
  async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    try {
      const [user] = await db
        .insert(users)
        .values({ email, passwordHash })
        .returning({ id: users.id, email: users.email });
      await establishSession(req, res, user, 201);
    } catch (error) {
      if (isUniqueViolation(error)) {
        res.status(409).json({
          message: "That email may already have an account. Try signing in.",
          errors: {
            email: "That email may already have an account. Try signing in.",
          },
        });
        return;
      }
      throw error;
    }
  },
);

app.post(
  "/api/auth/login",
  requireJson,
  requireCsrf,
  loginLimiter,
  async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      sendValidationError(res, parsed.error.issues);
      return;
    }

    const email = parsed.data.email.toLowerCase();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const passwordMatches = await bcrypt.compare(
      parsed.data.password,
      user?.passwordHash ?? (await dummyPasswordHash),
    );

    if (!user || !passwordMatches) {
      res.status(401).json({ message: "Email or password is incorrect." });
      return;
    }

    await establishSession(
      req,
      res,
      { id: user.id, email: user.email },
      200,
    );
  },
);

app.post(
  "/api/auth/logout",
  requireJson,
  requireCsrf,
  (req, res, next) => {
    req.session.destroy((error) => {
      if (error) {
        next(error);
        return;
      }
      res.clearCookie(sessionCookieName, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
      });
      res.json({ ok: true });
    });
  },
);

const restaurantProjection = {
  id: restaurants.id,
  cuisineId: restaurants.cuisineId,
  cuisineName: cuisines.name,
  name: restaurants.name,
  city: restaurants.city,
  notes: restaurants.notes,
  rating: restaurants.rating,
  visited: restaurants.visited,
  createdAt: restaurants.createdAt,
  updatedAt: restaurants.updatedAt,
};

const restaurantWithStarProjection = {
  ...restaurantProjection,
  isStarred: sql<boolean>`(${stars.restaurantId} IS NOT NULL)`,
};

function parseRestaurantId(idText: unknown): number | null {
  if (typeof idText !== "string" || !/^[1-9]\d*$/.test(idText)) {
    return null;
  }
  const id = Number(idText);
  return Number.isSafeInteger(id) && id <= 2_147_483_647 ? id : null;
}

function sendRestaurantNotFound(res: Response): void {
  res.status(404).json({ message: "Restaurant not found." });
}

function sendRestaurantValidationError(
  res: Response,
  issues: z.ZodIssue[],
): void {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = issue.message;
    }
  }
  res.status(400).json({ message: "Check the restaurant details.", errors });
}

app.get("/api/cuisines", requireAuthenticated, async (_req, res) => {
  const rows = await db
    .select({ id: cuisines.id, name: cuisines.name })
    .from(cuisines)
    .orderBy(asc(cuisines.name));

  res.setHeader("Cache-Control", "no-store");
  res.json({ cuisines: rows });
});

app.get("/api/dashboard", requireAuthenticated, async (req, res) => {
  const userId = req.session.userId!;
  const [summary] = await db
    .select({
      totalSaved: sql<number>`count(*)::int`,
      visitedCount: sql<number>`count(*) filter (where ${restaurants.visited})::int`,
      averageRating: sql<number | null>`round(avg(${restaurants.rating})::numeric, 1)::float8`,
    })
    .from(restaurants)
    .where(eq(restaurants.userId, userId));
  const cuisineCounts = await db
    .select({
      cuisineId: cuisines.id,
      cuisineName: cuisines.name,
      count: sql<number>`count(*)::int`,
    })
    .from(restaurants)
    .innerJoin(cuisines, eq(restaurants.cuisineId, cuisines.id))
    .where(eq(restaurants.userId, userId))
    .groupBy(cuisines.id, cuisines.name)
    .orderBy(asc(cuisines.name));

  res.setHeader("Cache-Control", "no-store");
  res.json({
    totalSaved: summary.totalSaved,
    visitedCount: summary.visitedCount,
    averageRating: summary.averageRating,
    cuisineCounts,
  });
});

app.get("/api/restaurants", requireAuthenticated, async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db
    .select(restaurantWithStarProjection)
    .from(restaurants)
    .innerJoin(cuisines, eq(restaurants.cuisineId, cuisines.id))
    .leftJoin(
      stars,
      and(
        eq(stars.restaurantId, restaurants.id),
        eq(stars.userId, userId),
      ),
    )
    .orderBy(desc(restaurants.createdAt), desc(restaurants.id));

  res.setHeader("Cache-Control", "no-store");
  res.json({ restaurants: rows });
});

app.get("/api/restaurants/starred", requireAuthenticated, async (req, res) => {
  const userId = req.session.userId!;
  const rows = await db
    .select(restaurantWithStarProjection)
    .from(restaurants)
    .innerJoin(cuisines, eq(restaurants.cuisineId, cuisines.id))
    .innerJoin(
      stars,
      and(
        eq(stars.restaurantId, restaurants.id),
        eq(stars.userId, userId),
      ),
    )
    .where(eq(restaurants.userId, userId))
    .orderBy(desc(restaurants.createdAt), desc(restaurants.id));

  res.setHeader("Cache-Control", "no-store");
  res.json({ restaurants: rows });
});

app.put(
  "/api/restaurants/:id/visited",
  requireJson,
  requireAuthenticated,
  requireCsrf,
  async (req, res) => {
    const id = parseRestaurantId(req.params.id);
    if (id === null) {
      sendRestaurantNotFound(res);
      return;
    }

    const visited = req.body?.visited;
    if (typeof visited !== "boolean") {
      res.status(400).json({ message: "Choose a valid visited status." });
      return;
    }

    const [updated] = await db
      .update(restaurants)
      .set({ visited, updatedAt: new Date() })
      .where(
        and(
          eq(restaurants.id, id),
          eq(restaurants.userId, req.session.userId!),
        ),
      )
      .returning({ visited: restaurants.visited });

    if (!updated) {
      sendRestaurantNotFound(res);
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({ visited: updated.visited });
  },
);

app.post(
  "/api/restaurants",
  requireJson,
  requireAuthenticated,
  requireCsrf,
  async (req, res) => {
    const parsed = restaurantInputSchema.safeParse(req.body);
    if (!parsed.success) {
      sendRestaurantValidationError(res, parsed.error.issues);
      return;
    }

    const [cuisine] = await db
      .select({ id: cuisines.id })
      .from(cuisines)
      .where(eq(cuisines.id, parsed.data.cuisineId))
      .limit(1);

    if (!cuisine) {
      res.status(400).json({
        message: "Choose a cuisine from the list.",
        errors: { cuisineId: "Choose a cuisine from the list." },
      });
      return;
    }

    const [created] = await db
      .insert(restaurants)
      .values({
        userId: req.session.userId!,
        cuisineId: cuisine.id,
        name: parsed.data.name,
        city: parsed.data.city?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        rating: parsed.data.rating ?? null,
      })
      .returning({ id: restaurants.id });

    const [restaurant] = await db
      .select(restaurantWithStarProjection)
      .from(restaurants)
      .innerJoin(cuisines, eq(restaurants.cuisineId, cuisines.id))
      .leftJoin(
        stars,
        and(
          eq(stars.restaurantId, restaurants.id),
          eq(stars.userId, req.session.userId!),
        ),
      )
      .where(
        and(
          eq(restaurants.id, created.id),
          eq(restaurants.userId, req.session.userId!),
        ),
      )
      .limit(1);

    if (!restaurant) {
      throw new Error("Created restaurant could not be reloaded.");
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(201).json({ restaurant });
  },
);

app.get(
  "/api/restaurants/:id",
  requireAuthenticated,
  async (req, res) => {
    const idText = req.params.id;
    if (typeof idText !== "string" || !/^[1-9]\d*$/.test(idText)) {
      sendRestaurantNotFound(res);
      return;
    }

    const id = Number(idText);
    if (!Number.isSafeInteger(id) || id > 2_147_483_647) {
      sendRestaurantNotFound(res);
      return;
    }

    const [restaurant] = await db
      .select(restaurantWithStarProjection)
      .from(restaurants)
      .innerJoin(cuisines, eq(restaurants.cuisineId, cuisines.id))
      .leftJoin(
        stars,
        and(
          eq(stars.restaurantId, restaurants.id),
          eq(stars.userId, req.session.userId!),
        ),
      )
      .where(
        and(
          eq(restaurants.id, id),
          eq(restaurants.userId, req.session.userId!),
        ),
      )
      .limit(1);

    if (!restaurant) {
      sendRestaurantNotFound(res);
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({ restaurant });
  },
);

app.put(
  "/api/restaurants/:id/star",
  requireAuthenticated,
  requireCsrf,
  async (req, res) => {
    const id = parseRestaurantId(req.params.id);
    if (id === null) {
      sendRestaurantNotFound(res);
      return;
    }

    const userId = req.session.userId!;
    const isOwned = await db.transaction(async (transaction) => {
      const [restaurant] = await transaction
        .select({ id: restaurants.id })
        .from(restaurants)
        .where(
          and(eq(restaurants.id, id), eq(restaurants.userId, userId)),
        )
        .for("update")
        .limit(1);
      if (!restaurant) return false;

      await transaction
        .insert(stars)
        .values({ userId, restaurantId: id })
        .onConflictDoNothing();
      return true;
    });

    if (!isOwned) {
      sendRestaurantNotFound(res);
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({ isStarred: true });
  },
);

app.delete(
  "/api/restaurants/:id/star",
  requireAuthenticated,
  requireCsrf,
  async (req, res) => {
    const id = parseRestaurantId(req.params.id);
    if (id === null) {
      sendRestaurantNotFound(res);
      return;
    }

    const userId = req.session.userId!;
    const isOwned = await db.transaction(async (transaction) => {
      const [restaurant] = await transaction
        .select({ id: restaurants.id })
        .from(restaurants)
        .where(
          and(eq(restaurants.id, id), eq(restaurants.userId, userId)),
        )
        .for("update")
        .limit(1);
      if (!restaurant) return false;

      await transaction
        .delete(stars)
        .where(and(eq(stars.userId, userId), eq(stars.restaurantId, id)));
      return true;
    });

    if (!isOwned) {
      sendRestaurantNotFound(res);
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({ isStarred: false });
  },
);

app.patch(
  "/api/restaurants/:id",
  requireJson,
  requireAuthenticated,
  requireCsrf,
  async (req, res) => {
    const idText = req.params.id;
    if (typeof idText !== "string" || !/^[1-9]\d*$/.test(idText)) {
      sendRestaurantNotFound(res);
      return;
    }

    const id = Number(idText);
    if (!Number.isSafeInteger(id) || id > 2_147_483_647) {
      sendRestaurantNotFound(res);
      return;
    }

    const [ownedRestaurant] = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(
        and(
          eq(restaurants.id, id),
          eq(restaurants.userId, req.session.userId!),
        ),
      )
      .limit(1);

    if (!ownedRestaurant) {
      sendRestaurantNotFound(res);
      return;
    }

    const parsed = restaurantUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      sendRestaurantValidationError(res, parsed.error.issues);
      return;
    }

    if (parsed.data.cuisineId !== undefined) {
      const [cuisine] = await db
        .select({ id: cuisines.id })
        .from(cuisines)
        .where(eq(cuisines.id, parsed.data.cuisineId))
        .limit(1);

      if (!cuisine) {
        res.status(400).json({
          message: "Choose a cuisine from the list.",
          errors: { cuisineId: "Choose a cuisine from the list." },
        });
        return;
      }
    }

    const updates: Partial<typeof restaurants.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.cuisineId !== undefined) {
      updates.cuisineId = parsed.data.cuisineId;
    }
    if (parsed.data.city !== undefined) {
      updates.city = parsed.data.city?.trim() || null;
    }
    if (parsed.data.notes !== undefined) {
      updates.notes = parsed.data.notes?.trim() || null;
    }
    if (parsed.data.rating !== undefined) {
      updates.rating = parsed.data.rating ?? null;
    }

    const [updated] = await db
      .update(restaurants)
      .set(updates)
      .where(
        and(
          eq(restaurants.id, id),
          eq(restaurants.userId, req.session.userId!),
        ),
      )
      .returning({ id: restaurants.id });

    if (!updated) {
      sendRestaurantNotFound(res);
      return;
    }

    const [restaurant] = await db
      .select(restaurantWithStarProjection)
      .from(restaurants)
      .innerJoin(cuisines, eq(restaurants.cuisineId, cuisines.id))
      .leftJoin(
        stars,
        and(
          eq(stars.restaurantId, restaurants.id),
          eq(stars.userId, req.session.userId!),
        ),
      )
      .where(
        and(
          eq(restaurants.id, id),
          eq(restaurants.userId, req.session.userId!),
        ),
      )
      .limit(1);

    if (!restaurant) {
      sendRestaurantNotFound(res);
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({ restaurant });
  },
);

app.delete(
  "/api/restaurants/:id",
  requireAuthenticated,
  requireCsrf,
  async (req, res) => {
    const idText = req.params.id;
    if (typeof idText !== "string" || !/^[1-9]\d*$/.test(idText)) {
      sendRestaurantNotFound(res);
      return;
    }

    const id = Number(idText);
    if (!Number.isSafeInteger(id) || id > 2_147_483_647) {
      sendRestaurantNotFound(res);
      return;
    }

    const [deleted] = await db
      .delete(restaurants)
      .where(
        and(
          eq(restaurants.id, id),
          eq(restaurants.userId, req.session.userId!),
        ),
      )
      .returning({ id: restaurants.id });

    if (!deleted) {
      sendRestaurantNotFound(res);
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.json({ ok: true });
  },
);

if (isProduction) {
  const clientDist = path.resolve(process.cwd(), "client/dist");
  app.use(express.static(clientDist, { index: false }));
  app.get(/^\/(?!api(?:\/|$)).*/, (_req, res, next) => {
    res.sendFile(path.join(clientDist, "index.html"), (error) => {
      if (error) next(error);
    });
  });
}

const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const isJsonSyntaxError =
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    error.type === "entity.parse.failed";

  res.status(isJsonSyntaxError ? 400 : 500).json({
    message: isJsonSyntaxError
      ? "The request body must be valid JSON."
      : "BiteBuddy could not complete the request. Please try again.",
  });
};

app.use(errorHandler);
