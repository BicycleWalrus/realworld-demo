import { act, renderHook } from "@testing-library/react";
import ThemeProvider, { useTheme } from "./ThemeContext";

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
  localStorage.clear();
  document.documentElement.dataset.theme = "";
});

it("initializes from the data-theme attribute already set on the document", () => {
  document.documentElement.dataset.theme = "dark";

  const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

  expect(result.current.theme).toBe("dark");
});

it("toggleTheme flips the theme and persists it to localStorage and the DOM", () => {
  document.documentElement.dataset.theme = "light";

  const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

  act(() => result.current.toggleTheme());

  expect(result.current.theme).toBe("dark");
  expect(localStorage.getItem("theme")).toBe("dark");
  expect(document.documentElement.dataset.theme).toBe("dark");

  act(() => result.current.toggleTheme());

  expect(result.current.theme).toBe("light");
  expect(localStorage.getItem("theme")).toBe("light");
  expect(document.documentElement.dataset.theme).toBe("light");
});
