import bcrypt from "bcryptjs";
import connectPgSimple from "connect-pg-simple";
import { randomBytes, timingSafeEqual } from "node:crypto";
import express from "express";
import type { ErrorRequestHandler, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import { and, asc, desc, eq } from "drizzle-orm";
import path from "node:path";
import { z } from "zod";
import { db, pool } from "./db/client.js";
import { cuisines, restaurants, users } from "./db/schema.js";

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

const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email address.")
  .max(254, "Email addresses must be 254 characters or fewer.")
  .email("Enter a valid email address.");

const signupSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(12, "Use at least 12 characters for your password.")
    .max(72, "Use no more than 72 characters for your password."),
});

const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(72, "Password must be 72 characters or fewer."),
});

const restaurantInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Enter a restaurant name.")
    .max(200, "Restaurant names must be 200 characters or fewer."),
  cuisineId: z.number().int().positive("Choose a cuisine."),
  city: z
    .string()
    .trim()
    .max(120, "City must be 120 characters or fewer.")
    .nullable()
    .optional(),
  notes: z
    .string()
    .trim()
    .max(5_000, "Notes must be 5,000 characters or fewer.")
    .nullable()
    .optional(),
  rating: z
    .number()
    .finite()
    .min(1, "Rating must be from 1.0 to 5.0.")
    .max(5, "Rating must be from 1.0 to 5.0.")
    .refine(
      (value) => Number(value.toFixed(1)) === value,
      "Rating must use one decimal place.",
    )
    .nullable()
    .optional(),
});

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

    if (Buffer.byteLength(parsed.data.password, "utf8") > 72) {
      res.status(400).json({
        message: "Check the highlighted fields.",
        errors: { password: "Use a password that is 72 UTF-8 bytes or fewer." },
      });
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

    if (Buffer.byteLength(parsed.data.password, "utf8") > 72) {
      res.status(400).json({
        message: "Check the highlighted fields.",
        errors: { password: "Password must be 72 UTF-8 bytes or fewer." },
      });
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

app.get("/api/restaurants", requireAuthenticated, async (req, res) => {
  const rows = await db
    .select(restaurantProjection)
    .from(restaurants)
    .innerJoin(cuisines, eq(restaurants.cuisineId, cuisines.id))
    .where(eq(restaurants.userId, req.session.userId!))
    .orderBy(desc(restaurants.createdAt), desc(restaurants.id));

  res.setHeader("Cache-Control", "no-store");
  res.json({ restaurants: rows });
});

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
      .select(restaurantProjection)
      .from(restaurants)
      .innerJoin(cuisines, eq(restaurants.cuisineId, cuisines.id))
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
      .select(restaurantProjection)
      .from(restaurants)
      .innerJoin(cuisines, eq(restaurants.cuisineId, cuisines.id))
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
