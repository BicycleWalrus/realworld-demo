import { applyTheme, resolveInitialTheme } from "./theme";

// REQ-050 / AC-081: a previously stored theme choice takes precedence.
describe("resolveInitialTheme — stored preference", () => {
  test("returns 'dark' when storage holds 'dark'", () => {
    const storage = { getItem: () => "dark" };

    expect(resolveInitialTheme(storage)).toBe("dark");
  });

  test("returns 'light' when storage holds 'light'", () => {
    const storage = { getItem: () => "light" };

    expect(resolveInitialTheme(storage)).toBe("light");
  });
});

// REQ-051 / AC-082: with no stored choice, fall back to the OS preference,
// defaulting to light when that preference is unavailable.
describe("resolveInitialTheme — OS preference fallback", () => {
  test("returns 'dark' when no stored value and matchMedia reports dark preference", () => {
    const storage = { getItem: () => null };
    const matchMediaFn = () => ({ matches: true });

    expect(resolveInitialTheme(storage, matchMediaFn)).toBe("dark");
  });

  test("returns 'light' when no stored value and matchMedia does not report dark preference", () => {
    const storage = { getItem: () => null };
    const matchMediaFn = () => ({ matches: false });

    expect(resolveInitialTheme(storage, matchMediaFn)).toBe("light");
  });

  test("returns 'light' when no stored value and matchMediaFn is undefined", () => {
    const storage = { getItem: () => null };

    expect(resolveInitialTheme(storage, undefined)).toBe("light");
  });

  // REQ-051: a storage read failure is treated the same as "no stored
  // choice" — it must still fall through to the OS preference check
  // rather than short-circuiting straight to light.
  test("returns 'dark' when reading storage throws and matchMedia reports dark preference", () => {
    const storage = {
      getItem: () => {
        throw new Error("storage disabled");
      },
    };
    const matchMediaFn = () => ({ matches: true });

    expect(resolveInitialTheme(storage, matchMediaFn)).toBe("dark");
  });

  test("returns 'light' when reading storage throws and matchMedia does not report dark preference", () => {
    const storage = {
      getItem: () => {
        throw new Error("storage disabled");
      },
    };
    const matchMediaFn = () => ({ matches: false });

    expect(resolveInitialTheme(storage, matchMediaFn)).toBe("light");
  });
});

// REQ-049 / REQ-052 / AC-080 / AC-083: applying a theme sets the attribute
// that the dark stylesheet is scoped to.
describe("applyTheme", () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme;
  });

  test("sets data-theme='dark' on the document root", () => {
    applyTheme("dark");

    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  test("sets data-theme='light' on the document root", () => {
    applyTheme("light");

    expect(document.documentElement.dataset.theme).toBe("light");
  });
});
