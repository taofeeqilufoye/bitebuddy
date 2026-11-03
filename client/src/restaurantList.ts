import type { Restaurant } from "./api";

export type RestaurantSort = "newest" | "name" | "rating";

export type RestaurantListFilters = {
  query: string;
  cuisineId: number | null;
  visited: boolean | null;
  sort: RestaurantSort;
};

export type RestaurantListItem = Pick<
  Restaurant,
  "id" | "name" | "city" | "cuisineId" | "rating" | "createdAt" | "visited"
>;

const nameCollator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function compareName(left: RestaurantListItem, right: RestaurantListItem) {
  return nameCollator.compare(left.name, right.name);
}

function compareId(left: RestaurantListItem, right: RestaurantListItem) {
  return left.id - right.id;
}

function compareNewest(left: RestaurantListItem, right: RestaurantListItem) {
  const leftDate = Date.parse(left.createdAt);
  const rightDate = Date.parse(right.createdAt);

  if (Number.isFinite(leftDate) && Number.isFinite(rightDate) && leftDate !== rightDate) {
    return rightDate - leftDate;
  }

  return right.id - left.id;
}

function compareRating(left: RestaurantListItem, right: RestaurantListItem) {
  if (left.rating === null && right.rating !== null) return 1;
  if (left.rating !== null && right.rating === null) return -1;

  if (left.rating !== null && right.rating !== null && left.rating !== right.rating) {
    return right.rating - left.rating;
  }

  return compareName(left, right) || compareId(left, right);
}

export function filterAndSortRestaurants<T extends RestaurantListItem>(
  restaurants: readonly T[],
  filters: RestaurantListFilters,
): T[] {
  const query = filters.query.trim().toLocaleLowerCase();

  return restaurants
    .filter((restaurant) => {
      const matchesQuery =
        !query ||
        restaurant.name.toLocaleLowerCase().includes(query) ||
        (restaurant.city ?? "").toLocaleLowerCase().includes(query);
      const matchesCuisine =
        filters.cuisineId === null || restaurant.cuisineId === filters.cuisineId;
      const matchesVisited =
        filters.visited === null || restaurant.visited === filters.visited;

      return matchesQuery && matchesCuisine && matchesVisited;
    })
    .slice()
    .sort((left, right) => {
      if (filters.sort === "name") {
        return compareName(left, right) || compareId(left, right);
      }
      if (filters.sort === "rating") {
        return compareRating(left, right);
      }
      return compareNewest(left, right);
    });
}
