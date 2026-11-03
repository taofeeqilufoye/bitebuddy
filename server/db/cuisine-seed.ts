import { db } from "./client.js";
import { cuisines } from "./schema.js";

export const CUISINE_LABELS = [
  "American",
  "Caribbean",
  "Chinese",
  "Colombian",
  "Dominican",
  "Ethiopian",
  "French",
  "Greek",
  "Indian",
  "Italian",
  "Japanese",
  "Korean",
  "Mexican",
  "Nigerian",
  "Thai",
  "Vietnamese",
] as const;

export async function seedCuisineLabels(database: typeof db = db): Promise<void> {
  await database
    .insert(cuisines)
    .values(CUISINE_LABELS.map((name) => ({ name })))
    .onConflictDoNothing({ target: cuisines.name });
}
