import { createContext, useContext, useEffect, useState } from "react";
import { THEMES, applyTheme, resolveInitialTheme } from "../helpers/theme";

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

const initialTheme = resolveInitialTheme(
  localStorage,
  window.matchMedia?.bind(window),
);

// Apply eagerly at module load (mirrors AuthContext's eager-read idiom) so
// a dark-preferring visitor doesn't see a flash of the light theme before
// the first effect runs.
applyTheme(initialTheme);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prevTheme) => {
      const nextTheme = prevTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;

      try {
        localStorage.setItem("theme", nextTheme);
      } catch {
        // ignore storage write failures (e.g. disabled/full storage)
      }

      return nextTheme;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
