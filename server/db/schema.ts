import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  json,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 254 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "users_email_normalized",
      sql`${table.email} = lower(btrim(${table.email}))`,
    ),
  ],
);

export const cuisines = pgTable(
  "cuisines",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
  },
  (table) => [
    unique("cuisines_name_unique").on(table.name),
    check(
      "cuisines_name_nonblank",
      sql`${table.name} ~ '[^[:space:]]'`,
    ),
  ],
);

export const restaurants = pgTable(
  "restaurants",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    cuisineId: integer("cuisine_id").notNull(),
    name: text("name").notNull(),
    city: text("city"),
    notes: text("notes"),
    rating: numeric("rating", { mode: "number" }),
    visited: boolean("visited").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "restaurants_user_id_users_id_fk",
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "restaurants_cuisine_id_cuisines_id_fk",
      columns: [table.cuisineId],
      foreignColumns: [cuisines.id],
    }).onDelete("restrict"),
    unique("restaurants_user_id_id_unique").on(table.userId, table.id),
    index("restaurants_user_created_at_idx").on(
      table.userId,
      table.createdAt.desc(),
    ),
    index("restaurants_cuisine_id_idx").on(table.cuisineId),
    check(
      "restaurants_name_nonblank",
      sql`${table.name} ~ '[^[:space:]]'`,
    ),
    check(
      "restaurants_rating_one_decimal_range",
      sql`${table.rating} is null or (${table.rating} >= 1 and ${table.rating} <= 5 and ${table.rating} = trunc(${table.rating}, 1))`,
    ),
  ],
);

export const stars = pgTable(
  "stars",
  {
    userId: integer("user_id").notNull(),
    restaurantId: integer("restaurant_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({
      name: "stars_pkey",
      columns: [table.userId, table.restaurantId],
    }),
    foreignKey({
      name: "stars_user_id_users_id_fk",
      columns: [table.userId],
      foreignColumns: [users.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "stars_owned_restaurant_fk",
      columns: [table.userId, table.restaurantId],
      foreignColumns: [restaurants.userId, restaurants.id],
    }).onDelete("cascade"),
    index("stars_restaurant_id_idx").on(table.restaurantId),
  ],
);

export const session = pgTable(
  "session",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire", { precision: 6 }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);
