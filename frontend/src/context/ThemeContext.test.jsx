import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";

function mockMatchMedia(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

function ThemeConsumer({ useTheme }) {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>toggle</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.resetModules();
});

// AC-086: no stored preference -> falls back to OS prefers-color-scheme.
test("defaults to dark when the OS prefers dark and no theme was ever chosen", async () => {
  mockMatchMedia(true);
  const { default: ThemeProvider, useTheme } = await import("./ThemeContext");

  render(
    <ThemeProvider>
      <ThemeConsumer useTheme={useTheme} />
    </ThemeProvider>,
  );

  expect(screen.getByTestId("theme")).toHaveTextContent("dark");
});

// AC-086: no stored preference and no OS dark preference -> defaults to light.
test("defaults to light when the OS does not prefer dark and no theme was ever chosen", async () => {
  mockMatchMedia(false);
  const { default: ThemeProvider, useTheme } = await import("./ThemeContext");

  render(
    <ThemeProvider>
      <ThemeConsumer useTheme={useTheme} />
    </ThemeProvider>,
  );

  expect(screen.getByTestId("theme")).toHaveTextContent("light");
});

// AC-085: a previously stored theme takes precedence over the OS preference.
test("a stored theme preference overrides the OS preference", async () => {
  mockMatchMedia(true);
  localStorage.setItem("theme", "light");
  const { default: ThemeProvider, useTheme } = await import("./ThemeContext");

  render(
    <ThemeProvider>
      <ThemeConsumer useTheme={useTheme} />
    </ThemeProvider>,
  );

  expect(screen.getByTestId("theme")).toHaveTextContent("light");
});

// AC-084: toggling switches the theme without a page reload.
test("toggleTheme flips the theme and updates the document attribute", async () => {
  mockMatchMedia(false);
  const { default: ThemeProvider, useTheme } = await import("./ThemeContext");

  render(
    <ThemeProvider>
      <ThemeConsumer useTheme={useTheme} />
    </ThemeProvider>,
  );

  expect(screen.getByTestId("theme")).toHaveTextContent("light");

  await userEvent.click(screen.getByText("toggle"));

  expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
});

// AC-085: the chosen theme persists to localStorage.
test("persists the theme choice to localStorage", async () => {
  mockMatchMedia(false);
  const { default: ThemeProvider, useTheme } = await import("./ThemeContext");

  render(
    <ThemeProvider>
      <ThemeConsumer useTheme={useTheme} />
    </ThemeProvider>,
  );

  await userEvent.click(screen.getByText("toggle"));

  expect(localStorage.getItem("theme")).toBe("dark");
});
