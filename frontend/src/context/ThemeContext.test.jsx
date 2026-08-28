import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeProvider, { getInitialTheme, useTheme } from "./ThemeContext";

// getInitialTheme() implements REQ-049's default-theme rule: an explicit
// prior choice in localStorage wins; otherwise fall back to the OS/browser
// color-scheme preference; otherwise default to light.
describe("getInitialTheme", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the stored theme when one was previously chosen", () => {
    localStorage.setItem("theme", "dark");

    window.matchMedia = () => ({ matches: false });

    expect(getInitialTheme()).toBe("dark");
  });

  it("falls back to the OS preference when nothing is stored", () => {
    window.matchMedia = () => ({ matches: true });

    expect(getInitialTheme()).toBe("dark");
  });

  it("defaults to light when nothing is stored and there is no OS preference", () => {
    window.matchMedia = () => ({ matches: false });

    expect(getInitialTheme()).toBe("light");
  });
});

function ThemeProbe() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  );
}

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    window.matchMedia = () => ({ matches: false });
    document.documentElement.removeAttribute("data-theme");
  });

  it("toggling the theme flips state, persists it, and updates the document attribute", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-value")).toHaveTextContent("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    await user.click(screen.getByText("toggle"));

    expect(screen.getByTestId("theme-value")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
