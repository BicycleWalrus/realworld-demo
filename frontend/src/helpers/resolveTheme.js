function resolveTheme() {
  const storedTheme = localStorage.getItem("theme");
  if (storedTheme) return storedTheme;

  const prefersDark =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  return prefersDark ? "dark" : "light";
}

export default resolveTheme;
