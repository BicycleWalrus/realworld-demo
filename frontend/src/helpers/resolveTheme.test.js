import { beforeEach, expect, test, vi } from "vitest";
import resolveTheme from "./resolveTheme";

function mockMatchMedia(matches) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

beforeEach(() => {
  localStorage.clear();
});

test("returns the stored theme when one exists, regardless of OS preference", () => {
  mockMatchMedia(true);
  localStorage.setItem("theme", "light");

  expect(resolveTheme()).toBe("light");
});

test("falls back to dark when no stored theme and the OS prefers dark", () => {
  mockMatchMedia(true);

  expect(resolveTheme()).toBe("dark");
});

test("falls back to light when no stored theme and the OS does not prefer dark", () => {
  mockMatchMedia(false);

  expect(resolveTheme()).toBe("light");
});
