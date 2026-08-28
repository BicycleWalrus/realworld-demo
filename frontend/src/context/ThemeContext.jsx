import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

const THEME_KEY = "theme";

export function useTheme() {
  return useContext(ThemeContext);
}

function getPreferredTheme() {
  const storedTheme = localStorage.getItem(THEME_KEY);
  if (storedTheme === "light" || storedTheme === "dark") return storedTheme;

  const prefersDark = window.matchMedia?.(
    "(prefers-color-scheme: dark)",
  ).matches;
  return prefersDark ? "dark" : "light";
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getPreferredTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
