export type Theme = "system" | "light" | "dark";

const THEME_KEY = "recall.theme";

export function savedTheme(): Theme {
  const saved = localStorage.getItem(THEME_KEY);
  return saved === "light" || saved === "dark" ? saved : "system";
}

export function applyTheme(theme: Theme) {
  if (theme === "system") {
    delete document.documentElement.dataset.theme;
    localStorage.removeItem(THEME_KEY);
  } else {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }
}

/** The theme actually on screen, after resolving "system". */
export function shownTheme(): "light" | "dark" {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
