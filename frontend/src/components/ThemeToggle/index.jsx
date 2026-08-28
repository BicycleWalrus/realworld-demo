import { THEMES } from "../../helpers/theme";
import { useTheme } from "../../context/ThemeContext";

// REQ-049 / REQ-052: theme toggle available on every page, for all auth
// states, switching instantly with no reload.
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === THEMES.DARK;
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <li className="nav-item">
      <button
        type="button"
        className="nav-link cursor-pointer"
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        aria-pressed={isDark}
      >
        <i className={isDark ? "ion-ios-sunny" : "ion-ios-moon"}></i>
      </button>
    </li>
  );
}

export default ThemeToggle;
