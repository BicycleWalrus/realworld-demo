import { createContext, useContext, useEffect, useRef, useState } from "react";

const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}

const prefersDarkQuery = "(prefers-color-scheme: dark)";

function getStoredTheme() {
  const stored = localStorage.getItem("theme");
  return stored === "light" || stored === "dark" ? stored : null;
}

function getInitialTheme() {
  return (
    getStoredTheme() ??
    (window.matchMedia(prefersDarkQuery).matches ? "dark" : "light")
  );
}

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const hasExplicitChoice = useRef(getStoredTheme() !== null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(prefersDarkQuery);
    const onChange = (e) => {
      if (hasExplicitChoice.current) return;
      setTheme(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", onChange);
    return () => mediaQuery.removeEventListener("change", onChange);
  }, []);

  function toggleTheme() {
    hasExplicitChoice.current = true;
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
