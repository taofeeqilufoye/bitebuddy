export type Cuisine = {
  id: number;
  name: string;
};

export type Restaurant = {
  id: number;
  cuisineId: number;
  cuisineName: string;
  name: string;
  city: string | null;
  notes: string | null;
  rating: number | null;
  visited: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateRestaurantInput = {
  name: string;
  cuisineId: number;
  city: string | null;
  notes: string | null;
  rating: number | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ApiErrorPayload = {
  message?: string;
  errors?: Record<string, string>;
};

async function requestJson<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    payload = undefined;
  }

  if (!response.ok) {
    const errorPayload =
      typeof payload === "object" && payload !== null
        ? (payload as ApiErrorPayload)
        : {};
    throw new ApiError(
      errorPayload.message ?? "BiteBuddy couldn't complete that request.",
      response.status,
      errorPayload.errors ?? {},
    );
  }

  return payload as T;
}

export async function fetchCuisines(): Promise<Cuisine[]> {
  const payload = await requestJson<{ cuisines: Cuisine[] }>("/api/cuisines");
  return payload.cuisines;
}

export async function fetchRestaurants(): Promise<Restaurant[]> {
  const payload = await requestJson<{ restaurants: Restaurant[] }>(
    "/api/restaurants",
  );
  return payload.restaurants;
}

export async function fetchRestaurant(id: number): Promise<Restaurant> {
  const payload = await requestJson<{ restaurant: Restaurant }>(
    `/api/restaurants/${encodeURIComponent(id)}`,
  );
  return payload.restaurant;
}

export async function createRestaurant(
  input: CreateRestaurantInput,
  csrfToken: string,
): Promise<Restaurant> {
  const payload = await requestJson<{ restaurant: Restaurant }>(
    "/api/restaurants",
    {
      method: "POST",
      headers: { "x-csrf-token": csrfToken },
      body: JSON.stringify(input),
    },
  );
  return payload.restaurant;
}
