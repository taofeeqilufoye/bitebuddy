import { describe, expect, it } from "vitest";
import {
  ACCOUNT_LIMITS,
  RESTAURANT_LIMITS,
  loginSchema,
  restaurantInputSchema,
  restaurantRatingInputSchema,
  signupSchema,
} from "../server/validation";

describe("shared client and server validation", () => {
  it("accepts valid account input and rejects invalid email and password values", () => {
    const validPassword = "BiteBuddy-Test-Password";
    const validSignup = signupSchema.safeParse({
      email: "  person@example.test  ",
      password: validPassword,
    });
    expect(validSignup.success).toBe(true);
    if (validSignup.success) expect(validSignup.data.email).toBe("person@example.test");

    expect(
      signupSchema.safeParse({
        email: "invalid",
        password: "short",
      }).success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({
        email: "person@example.test",
        password: "😀".repeat(19),
      }).success,
    ).toBe(false);
    expect(
      loginSchema.safeParse({
        email: "person@example.test",
        password: "x".repeat(ACCOUNT_LIMITS.passwordCharacters + 1),
      }).success,
    ).toBe(false);
  });

  it("accepts blank or one-decimal ratings without rounding invalid values", () => {
    expect(restaurantRatingInputSchema.safeParse("").data).toBeNull();
    expect(restaurantRatingInputSchema.safeParse("1").data).toBe(1);
    expect(restaurantRatingInputSchema.safeParse("4.6").data).toBe(4.6);
    expect(restaurantRatingInputSchema.safeParse("5.0").data).toBe(5);

    for (const value of ["0.9", "5.1", "4.56", "1.00", "1e0"]) {
      expect(restaurantRatingInputSchema.safeParse(value).success).toBe(false);
    }
  });

  it("applies the same restaurant field limits to create and edit inputs", () => {
    const validInput = {
      name: "  Example place  ",
      cuisineId: 1,
      city: "",
      notes: " ",
      rating: 4.6,
    };
    const parsed = restaurantInputSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.name).toBe("Example place");
      expect(parsed.data.city).toBe("");
      expect(parsed.data.notes).toBe("");
    }

    expect(
      restaurantInputSchema.safeParse({
        ...validInput,
        name: "x".repeat(RESTAURANT_LIMITS.nameCharacters + 1),
      }).success,
    ).toBe(false);
    expect(
      restaurantInputSchema.safeParse({
        ...validInput,
        city: "x".repeat(RESTAURANT_LIMITS.cityCharacters + 1),
      }).success,
    ).toBe(false);
    expect(
      restaurantInputSchema.safeParse({
        ...validInput,
        notes: "x".repeat(RESTAURANT_LIMITS.notesCharacters + 1),
      }).success,
    ).toBe(false);
    expect(
      restaurantInputSchema.safeParse({ ...validInput, name: "   " }).success,
    ).toBe(false);
    expect(
      restaurantInputSchema.safeParse({ ...validInput, rating: 4.56 }).success,
    ).toBe(false);
  });
});
