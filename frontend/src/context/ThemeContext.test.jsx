import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import ThemeProvider, { useTheme } from "./ThemeContext";

function mockMatchMedia(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

function Consumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme}>{theme}</button>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  mockMatchMedia(false);
});

// REQ-049: defaults to OS/browser color-scheme preference when unset
describe("ThemeProvider", () => {
  test("defaults to light when no stored preference and OS prefers light", () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  test("defaults to dark when no stored preference and OS prefers dark", () => {
    mockMatchMedia(true);
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  test("stored preference overrides the OS default", () => {
    localStorage.setItem("theme", "dark");
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );
    expect(screen.getByRole("button")).toHaveTextContent("dark");
  });

  test("toggling switches the theme and persists the choice", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Consumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toHaveTextContent("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    await user.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toHaveTextContent("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });
});
