import { createContext, useContext, useEffect, useState } from "react";
import resolveInitialTheme from "../helpers/resolveInitialTheme";

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

const THEME_STORAGE_KEY = "theme";

function ThemeProvider({ children }) {
  // index.html's inline bootstrap script already set this attribute
  // synchronously before first paint; resolveInitialTheme() is only a
  // fallback for the case it wasn't set.
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || resolveInitialTheme(),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
