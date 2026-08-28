import { useTheme } from "../../context/ThemeContext";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <li className="nav-item">
      <button
        type="button"
        className="nav-link theme-toggle-btn"
        onClick={toggleTheme}
        aria-pressed={isDark}
        aria-label={label}
        title={label}
      >
        <i className={isDark ? "ion-ios-sunny" : "ion-ios-moon"}></i>
      </button>
    </li>
  );
}

export default ThemeToggle;
