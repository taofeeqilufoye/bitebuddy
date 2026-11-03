import { z } from "zod";

// This runtime-neutral module is shared by the browser forms and API routes.
export const ACCOUNT_LIMITS = {
  emailCharacters: 254,
  passwordCharacters: 72,
  passwordUtf8Bytes: 72,
  signupPasswordMinimum: 12,
} as const;

export const RESTAURANT_LIMITS = {
  nameCharacters: 200,
  cityCharacters: 120,
  notesCharacters: 5_000,
} as const;

export const RESTAURANT_RATING_ERROR =
  "Use a rating from 1.0 to 5.0 with at most one decimal place.";

function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

const passwordBytesSchema = z.string().refine(
  (value) => utf8Length(value) <= ACCOUNT_LIMITS.passwordUtf8Bytes,
  `Use no more than ${ACCOUNT_LIMITS.passwordUtf8Bytes} UTF-8 bytes for your password.`,
);

export const emailSchema = z
  .string({ error: "Enter your email address." })
  .trim()
  .min(1, "Enter your email address.")
  .max(
    ACCOUNT_LIMITS.emailCharacters,
    `Email addresses must be ${ACCOUNT_LIMITS.emailCharacters} characters or fewer.`,
  )
  .email("Enter a valid email address.");

export const signupSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Enter your password." })
    .min(
      ACCOUNT_LIMITS.signupPasswordMinimum,
      `Use at least ${ACCOUNT_LIMITS.signupPasswordMinimum} characters for your password.`,
    )
    .max(
      ACCOUNT_LIMITS.passwordCharacters,
      `Use no more than ${ACCOUNT_LIMITS.passwordCharacters} characters for your password.`,
    )
    .pipe(passwordBytesSchema),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({ error: "Enter your password." })
    .min(1, "Enter your password.")
    .max(
      ACCOUNT_LIMITS.passwordCharacters,
      `Password must be ${ACCOUNT_LIMITS.passwordCharacters} characters or fewer.`,
    )
    .pipe(passwordBytesSchema),
});

export const restaurantRatingSchema = z
  .number({ error: RESTAURANT_RATING_ERROR })
  .min(1, RESTAURANT_RATING_ERROR)
  .max(5, RESTAURANT_RATING_ERROR)
  .refine((value) => Number(value.toFixed(1)) === value, RESTAURANT_RATING_ERROR);

export const restaurantRatingInputSchema = z
  .string()
  .trim()
  .refine(
    (value) => value === "" || /^\d(?:\.\d)?$/.test(value),
    RESTAURANT_RATING_ERROR,
  )
  .transform((value) => (value === "" ? null : Number(value)))
  .pipe(restaurantRatingSchema.nullable());

export const restaurantInputSchema = z.object({
  name: z
    .string({ error: "Enter a restaurant name." })
    .trim()
    .min(1, "Enter a restaurant name.")
    .max(
      RESTAURANT_LIMITS.nameCharacters,
      `Restaurant names must be ${RESTAURANT_LIMITS.nameCharacters} characters or fewer.`,
    ),
  cuisineId: z
    .number({ error: "Choose a cuisine." })
    .int("Choose a cuisine.")
    .positive("Choose a cuisine."),
  city: z
    .string({ error: "Enter a city or leave it blank." })
    .trim()
    .max(
      RESTAURANT_LIMITS.cityCharacters,
      `City must be ${RESTAURANT_LIMITS.cityCharacters} characters or fewer.`,
    )
    .nullable()
    .optional(),
  notes: z
    .string({ error: "Enter notes or leave them blank." })
    .trim()
    .max(
      RESTAURANT_LIMITS.notesCharacters,
      `Notes must be ${RESTAURANT_LIMITS.notesCharacters} characters or fewer.`,
    )
    .nullable()
    .optional(),
  rating: restaurantRatingSchema.nullable().optional(),
});

export const restaurantUpdateSchema = restaurantInputSchema
  .partial()
  .strict()
  .refine((input) => Object.keys(input).length > 0, {
    message: "Update at least one restaurant detail.",
  });
