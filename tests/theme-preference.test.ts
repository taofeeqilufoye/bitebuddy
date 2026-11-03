import { describe, expect, it } from "vitest";
import {
  readThemePreference,
  saveThemePreference,
  THEME_STORAGE_KEY,
} from "../client/src/themePreference";

describe("theme preference", () => {
  it("uses a saved choice instead of the current device preference", () => {
    const storage = {
      getItem: () => "light",
      setItem: () => {},
    };

    expect(readThemePreference(storage, true)).toEqual({
      theme: "light",
      explicit: true,
    });
  });

  it("follows the device when there is no valid saved choice", () => {
    const storage = {
      getItem: () => "sepia",
      setItem: () => {},
    };

    expect(readThemePreference(storage, true)).toEqual({
      theme: "dark",
      explicit: false,
    });
    expect(readThemePreference(null, false)).toEqual({
      theme: "light",
      explicit: false,
    });
  });

  it("falls back to the device when reading storage is blocked", () => {
    const storage = {
      getItem: () => {
        throw new Error("Storage is unavailable");
      },
      setItem: () => {},
    };

    expect(readThemePreference(storage, true)).toEqual({
      theme: "dark",
      explicit: false,
    });
  });

  it("saves explicit choices and safely ignores blocked writes", () => {
    const writes: Array<[string, string]> = [];
    saveThemePreference(
      {
        setItem: (key, value) => writes.push([key, value]),
      },
      "dark",
    );

    expect(writes).toEqual([[THEME_STORAGE_KEY, "dark"]]);
    expect(() =>
      saveThemePreference(
        {
          setItem: () => {
            throw new Error("Storage is unavailable");
          },
        },
        "light",
      ),
    ).not.toThrow();
  });
});
