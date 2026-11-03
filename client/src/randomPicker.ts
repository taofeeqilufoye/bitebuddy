export type RestaurantCandidate = {
  id: number;
};

export function pickRandomRestaurant<T>(
  candidates: readonly T[],
  random: () => number = Math.random,
): T | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0] ?? null;

  const randomIndex = Math.floor(random() * candidates.length);
  const safeIndex = Math.max(0, Math.min(candidates.length - 1, randomIndex));
  return candidates[safeIndex] ?? null;
}

export function keepPickedRestaurantId(
  pickedId: number | null,
  candidates: readonly RestaurantCandidate[],
): number | null {
  if (pickedId === null) return null;
  return candidates.some((candidate) => candidate.id === pickedId)
    ? pickedId
    : null;
}
