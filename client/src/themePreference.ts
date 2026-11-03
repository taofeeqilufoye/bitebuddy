export type Theme = "light" | "dark";

export type ThemePreference = {
  theme: Theme;
  explicit: boolean;
};

export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const THEME_STORAGE_KEY = "bitebuddy-theme";

export function resolveThemePreference(
  storedTheme: string | null,
  prefersDark: boolean,
): ThemePreference {
  if (storedTheme === "light" || storedTheme === "dark") {
    return { theme: storedTheme, explicit: true };
  }

  return { theme: prefersDark ? "dark" : "light", explicit: false };
}

export function readThemePreference(
  storage: Pick<ThemeStorage, "getItem"> | null,
  prefersDark: boolean,
): ThemePreference {
  try {
    return resolveThemePreference(
      storage?.getItem(THEME_STORAGE_KEY) ?? null,
      prefersDark,
    );
  } catch {
    return resolveThemePreference(null, prefersDark);
  }
}

export function saveThemePreference(
  storage: Pick<ThemeStorage, "setItem"> | null,
  theme: Theme,
): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Keep the in-memory choice even when browser storage is unavailable.
  }
}
