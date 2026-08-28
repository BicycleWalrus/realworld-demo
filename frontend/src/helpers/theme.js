export const THEMES = {
  LIGHT: "light",
  DARK: "dark",
};

const VALID_THEMES = Object.values(THEMES);

/**
 * Resolve the theme to use on initial load.
 *
 * Prefers a previously stored theme; falls back to the OS preference via
 * `matchMediaFn`; defaults to light when neither is available.
 *
 * @param {Storage} storage - a Storage-like object (e.g. localStorage)
 * @param {Function} [matchMediaFn] - e.g. window.matchMedia, may be undefined
 * @returns {"dark"|"light"}
 */
export function resolveInitialTheme(storage, matchMediaFn) {
  let stored;
  try {
    stored = storage?.getItem("theme");
  } catch {
    stored = null;
  }

  if (VALID_THEMES.includes(stored)) {
    return stored;
  }

  if (matchMediaFn?.("(prefers-color-scheme: dark)")?.matches) {
    return THEMES.DARK;
  }

  return THEMES.LIGHT;
}

/**
 * Apply the given theme to the document by setting the `data-theme`
 * attribute on the root element.
 *
 * @param {"dark"|"light"} theme
 */
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
}
