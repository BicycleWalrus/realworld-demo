import { useTheme } from "../../context/ThemeContext";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <li className="nav-item">
      <button
        type="button"
        className="nav-link theme-toggle"
        onClick={toggleTheme}
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      >
        <i className={isDark ? "ion-ios-sunny" : "ion-ios-moon"}></i>
      </button>
    </li>
  );
}

export default ThemeToggle;
