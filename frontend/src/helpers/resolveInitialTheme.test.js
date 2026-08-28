import resolveInitialTheme from "./resolveInitialTheme";

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
  window.matchMedia = undefined;
});

it("uses the stored value when present", () => {
  localStorage.setItem("theme", "dark");

  expect(resolveInitialTheme()).toBe("dark");
});

it("falls back to matchMedia when nothing is stored", () => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true });

  expect(resolveInitialTheme()).toBe("dark");
});

it("defaults to light when matchMedia has no dark preference", () => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false });

  expect(resolveInitialTheme()).toBe("light");
});

it("defaults to light when matchMedia is unavailable and nothing stored", () => {
  expect(resolveInitialTheme()).toBe("light");
});
