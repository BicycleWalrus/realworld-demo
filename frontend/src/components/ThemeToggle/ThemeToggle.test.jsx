import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ThemeToggle from "./ThemeToggle";
import ThemeProvider from "../../context/ThemeContext";

// This environment's jsdom/vitest combination doesn't wire up a working
// global localStorage, so tests that need it stub it directly.
function createLocalStorageMock() {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

vi.stubGlobal("localStorage", createLocalStorageMock());

beforeEach(() => {
  document.documentElement.dataset.theme = "light";
});

it("toggles the theme when clicked", async () => {
  render(<ThemeToggle />, { wrapper: ThemeProvider });

  const button = screen.getByRole("button", { name: /switch to dark theme/i });

  await userEvent.click(button);

  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(
    screen.getByRole("button", { name: /switch to light theme/i }),
  ).toBeInTheDocument();
});
