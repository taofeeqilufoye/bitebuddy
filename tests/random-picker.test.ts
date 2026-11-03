import { describe, expect, it, vi } from "vitest";
import { filterAndSortRestaurants } from "../client/src/restaurantList";
import {
  keepPickedRestaurantId,
  pickRandomRestaurant,
} from "../client/src/randomPicker";
import type { RestaurantListItem } from "../client/src/restaurantList";

const candidates: RestaurantListItem[] = [
  {
    id: 10,
    name: "Cedar House",
    city: "Lagos",
    cuisineId: 1,
    rating: 4,
    createdAt: "2026-06-01T10:00:00.000Z",
    visited: true,
  },
  {
    id: 20,
    name: "Market Table",
    city: "Portland",
    cuisineId: 2,
    rating: null,
    createdAt: "2026-06-02T10:00:00.000Z",
    visited: false,
  },
  {
    id: 30,
    name: "Palm & Pepper",
    city: "Lagos",
    cuisineId: 1,
    rating: 5,
    createdAt: "2026-06-03T10:00:00.000Z",
    visited: true,
  },
];

describe("restaurant random picker", () => {
  it("returns no choice when there are no candidates", () => {
    const random = vi.fn(() => 0.5);
    expect(pickRandomRestaurant([], random)).toBeNull();
    expect(random).not.toHaveBeenCalled();
  });

  it("returns a single candidate deterministically without using randomness", () => {
    const random = vi.fn(() => 0.9);
    expect(pickRandomRestaurant([candidates[1]], random)).toBe(candidates[1]);
    expect(random).not.toHaveBeenCalled();
  });

  it("selects only among candidates produced by the active filters", () => {
    const visible = filterAndSortRestaurants(candidates, {
      query: "lagos",
      cuisineId: 1,
      visited: true,
      sort: "newest",
    });
    const picked = pickRandomRestaurant(visible, () => 0.99);

    expect(visible.map((restaurant) => restaurant.id)).toEqual([30, 10]);
    expect(picked?.id).toBe(10);
    expect(visible).toContain(picked);
  });

  it("keeps a selection only while it remains in the current candidate list", () => {
    expect(keepPickedRestaurantId(20, candidates)).toBe(20);
    expect(keepPickedRestaurantId(20, candidates.slice(1))).toBe(20);
    expect(keepPickedRestaurantId(20, candidates.slice(0, 1))).toBeNull();
    expect(keepPickedRestaurantId(null, candidates)).toBeNull();
  });
});
