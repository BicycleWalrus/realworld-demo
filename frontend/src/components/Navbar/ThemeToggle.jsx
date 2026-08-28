import { useTheme } from "../../context/ThemeContext";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <li className="nav-item">
      <button
        aria-label="Toggle dark mode"
        className="nav-link btn btn-link"
        onClick={toggleTheme}
        type="button"
      >
        <i className={theme === "dark" ? "ion-ios-sunny" : "ion-ios-moon"}></i>
      </button>
    </li>
  );
}

export default ThemeToggle;
