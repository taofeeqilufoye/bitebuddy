import type { Theme } from "./themePreference";

export default function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle: () => void;
}) {
  const isDark = theme === "dark";

  return (
    <button
      className="theme-toggle"
      type="button"
      aria-label="Dark mode"
      aria-pressed={isDark}
      onClick={onToggle}
    >
      <span>Dark mode</span>
      <span className="theme-toggle-state" aria-hidden="true">
        {isDark ? "On" : "Off"}
      </span>
    </button>
  );
}
