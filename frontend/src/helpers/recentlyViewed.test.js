import { beforeEach, expect, it } from "vitest";
import { getRecentlyViewed, recordRecentlyViewed } from "./recentlyViewed";

beforeEach(() => {
  localStorage.clear();
});

it("returns an empty list when nothing has been viewed", () => {
  expect(getRecentlyViewed()).toEqual([]);
});

it("records a viewed article at the front of the list", () => {
  recordRecentlyViewed({ slug: "first", title: "First" });

  expect(getRecentlyViewed()).toEqual([{ slug: "first", title: "First" }]);
});

it("moves an already-viewed article to the front instead of duplicating it", () => {
  recordRecentlyViewed({ slug: "first", title: "First" });
  recordRecentlyViewed({ slug: "second", title: "Second" });
  recordRecentlyViewed({ slug: "first", title: "First" });

  expect(getRecentlyViewed()).toEqual([
    { slug: "first", title: "First" },
    { slug: "second", title: "Second" },
  ]);
});

it("caps the list at 5 entries, dropping the oldest", () => {
  for (let i = 1; i <= 6; i++) {
    recordRecentlyViewed({ slug: `slug-${i}`, title: `Title ${i}` });
  }

  const recentlyViewed = getRecentlyViewed();

  expect(recentlyViewed).toHaveLength(5);
  expect(recentlyViewed[0]).toEqual({ slug: "slug-6", title: "Title 6" });
  expect(
    recentlyViewed.find((article) => article.slug === "slug-1"),
  ).toBeUndefined();
});
