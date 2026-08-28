// Kept in sync with the inline bootstrap script in index.html, which
// duplicates this same decision to set data-theme before first paint.
export default function resolveInitialTheme() {
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;

  const prefersDark =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
}
