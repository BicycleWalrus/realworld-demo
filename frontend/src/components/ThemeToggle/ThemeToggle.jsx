import { useTheme } from "../../context/ThemeContext";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <li className="nav-item">
      <div
        className="nav-link cursor-pointer"
        onClick={toggleTheme}
        role="button"
        aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      >
        <i className={isDark ? "ion-ios-sunny-outline" : "ion-ios-moon"}></i>
      </div>
    </li>
  );
}

export default ThemeToggle;
