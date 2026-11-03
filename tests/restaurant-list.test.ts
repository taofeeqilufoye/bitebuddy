import { describe, expect, it } from "vitest";
import {
  filterAndSortRestaurants,
  type RestaurantListItem,
} from "../client/src/restaurantList";

const restaurants: RestaurantListItem[] = [
  {
    id: 8,
    name: "Harbor Bistro",
    city: "New York",
    cuisineId: 1,
    rating: 4,
    createdAt: "2026-05-01T10:00:00.000Z",
  },
  {
    id: 3,
    name: "alpha table",
    city: null,
    cuisineId: 2,
    rating: 4,
    createdAt: "2026-05-03T10:00:00.000Z",
  },
  {
    id: 11,
    name: "Alpha Table",
    city: "Lagos",
    cuisineId: 2,
    rating: 5,
    createdAt: "2026-05-03T10:00:00.000Z",
  },
  {
    id: 15,
    name: "Zola Kitchen",
    city: "Paris",
    cuisineId: 1,
    rating: null,
    createdAt: "2026-05-04T10:00:00.000Z",
  },
  {
    id: 2,
    name: "Auburn Room",
    city: null,
    cuisineId: 2,
    rating: null,
    createdAt: "2026-05-02T10:00:00.000Z",
  },
];

describe("restaurant collection filtering and sorting", () => {
  it("searches restaurant names and cities without case sensitivity", () => {
    const byName = filterAndSortRestaurants(restaurants, {
      query: "  bIsTrO ",
      cuisineId: null,
      sort: "newest",
    });
    const byCity = filterAndSortRestaurants(restaurants, {
      query: "nEw YoRk",
      cuisineId: null,
      sort: "newest",
    });

    expect(byName.map((restaurant) => restaurant.id)).toEqual([8]);
    expect(byCity.map((restaurant) => restaurant.id)).toEqual([8]);
  });

  it("combines city search and cuisine filtering", () => {
    const result = filterAndSortRestaurants(restaurants, {
      query: "la",
      cuisineId: 2,
      sort: "name",
    });

    expect(result.map((restaurant) => restaurant.id)).toEqual([11]);
  });

  it("sorts by name with stable ID ties", () => {
    const result = filterAndSortRestaurants(restaurants, {
      query: "",
      cuisineId: null,
      sort: "name",
    });

    expect(result.map((restaurant) => restaurant.id)).toEqual([3, 11, 2, 8, 15]);
  });

  it("sorts highest ratings first, leaves unrated places last, and resolves ties deterministically", () => {
    const result = filterAndSortRestaurants(restaurants, {
      query: "",
      cuisineId: null,
      sort: "rating",
    });

    expect(result.map((restaurant) => restaurant.id)).toEqual([11, 3, 8, 2, 15]);
  });

  it("sorts newest first and uses descending ID for identical timestamps", () => {
    const result = filterAndSortRestaurants(restaurants, {
      query: "",
      cuisineId: null,
      sort: "newest",
    });

    expect(result.map((restaurant) => restaurant.id)).toEqual([15, 11, 3, 2, 8]);
  });

  it("does not mutate the source collection", () => {
    const originalIds = restaurants.map((restaurant) => restaurant.id);
    filterAndSortRestaurants(restaurants, {
      query: "",
      cuisineId: null,
      sort: "name",
    });

    expect(restaurants.map((restaurant) => restaurant.id)).toEqual(originalIds);
  });
});
