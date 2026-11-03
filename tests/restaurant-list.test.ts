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
    visited: false,
  },
  {
    id: 3,
    name: "alpha table",
    city: null,
    cuisineId: 2,
    rating: 4,
    createdAt: "2026-05-03T10:00:00.000Z",
    visited: false,
  },
  {
    id: 11,
    name: "Alpha Table",
    city: "Lagos",
    cuisineId: 2,
    rating: 5,
    createdAt: "2026-05-03T10:00:00.000Z",
    visited: true,
  },
  {
    id: 15,
    name: "Zola Kitchen",
    city: "Paris",
    cuisineId: 1,
    rating: null,
    createdAt: "2026-05-04T10:00:00.000Z",
    visited: true,
  },
  {
    id: 2,
    name: "Auburn Room",
    city: null,
    cuisineId: 2,
    rating: null,
    createdAt: "2026-05-02T10:00:00.000Z",
    visited: false,
  },
];

describe("restaurant collection filtering and sorting", () => {
  it("searches restaurant names and cities without case sensitivity", () => {
    const byName = filterAndSortRestaurants(restaurants, {
      query: "  bIsTrO ",
      cuisineId: null,
      visited: null,
      sort: "newest",
    });
    const byCity = filterAndSortRestaurants(restaurants, {
      query: "nEw YoRk",
      cuisineId: null,
      visited: null,
      sort: "newest",
    });

    expect(byName.map((restaurant) => restaurant.id)).toEqual([8]);
    expect(byCity.map((restaurant) => restaurant.id)).toEqual([8]);
  });

  it("combines city search and cuisine filtering", () => {
    const result = filterAndSortRestaurants(restaurants, {
      query: "la",
      cuisineId: 2,
      visited: null,
      sort: "name",
    });

    expect(result.map((restaurant) => restaurant.id)).toEqual([11]);
  });

  it("sorts by name with stable ID ties", () => {
    const result = filterAndSortRestaurants(restaurants, {
      query: "",
      cuisineId: null,
      visited: null,
      sort: "name",
    });

    expect(result.map((restaurant) => restaurant.id)).toEqual([3, 11, 2, 8, 15]);
  });

  it("sorts highest ratings first, leaves unrated places last, and resolves ties deterministically", () => {
    const result = filterAndSortRestaurants(restaurants, {
      query: "",
      cuisineId: null,
      visited: null,
      sort: "rating",
    });

    expect(result.map((restaurant) => restaurant.id)).toEqual([11, 3, 8, 2, 15]);
  });

  it("sorts newest first and uses descending ID for identical timestamps", () => {
    const result = filterAndSortRestaurants(restaurants, {
      query: "",
      cuisineId: null,
      visited: null,
      sort: "newest",
    });

    expect(result.map((restaurant) => restaurant.id)).toEqual([15, 11, 3, 2, 8]);
  });

  it("does not mutate the source collection", () => {
    const originalIds = restaurants.map((restaurant) => restaurant.id);
    filterAndSortRestaurants(restaurants, {
      query: "",
      cuisineId: null,
      visited: null,
      sort: "name",
    });

    expect(restaurants.map((restaurant) => restaurant.id)).toEqual(originalIds);
  });

  it("combines visited status with search, cuisine, and sort filters", () => {
    const visitedLagos = filterAndSortRestaurants(restaurants, {
      query: "lagos",
      cuisineId: 2,
      visited: true,
      sort: "rating",
    });
    const wantToTryCuisine = filterAndSortRestaurants(restaurants, {
      query: "",
      cuisineId: 2,
      visited: false,
      sort: "name",
    });

    expect(visitedLagos.map((restaurant) => restaurant.id)).toEqual([11]);
    expect(wantToTryCuisine.map((restaurant) => restaurant.id)).toEqual([3, 2]);
  });
});
