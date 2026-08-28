import { addRecentlyViewed, getRecentlyViewed, MAX_RECENTLY_VIEWED } from "./recentlyViewed";

beforeEach(() => {
  localStorage.clear();
});

// AC-138: opening an article records it, and it can be read back.
describe("recording and reading recently-viewed articles", () => {
  test("addRecentlyViewed stores an article and getRecentlyViewed returns it", () => {
    addRecentlyViewed({ slug: "dragon-tale", title: "Dragon Tale" });

    expect(getRecentlyViewed()).toEqual([{ slug: "dragon-tale", title: "Dragon Tale" }]);
  });
});

// AC-139: most-recent first, no duplicate entries, capped at 10.
describe("ordering, deduping, and capping", () => {
  test("a second, different article is added to the front (newest first)", () => {
    addRecentlyViewed({ slug: "first", title: "First" });
    addRecentlyViewed({ slug: "second", title: "Second" });

    expect(getRecentlyViewed()).toEqual([
      { slug: "second", title: "Second" },
      { slug: "first", title: "First" },
    ]);
  });

  test("re-viewing an existing article moves it to the top without duplicating it", () => {
    addRecentlyViewed({ slug: "first", title: "First" });
    addRecentlyViewed({ slug: "second", title: "Second" });
    addRecentlyViewed({ slug: "first", title: "First" });

    const list = getRecentlyViewed();
    expect(list).toHaveLength(2);
    expect(list[0]).toEqual({ slug: "first", title: "First" });
  });

  test("adding more than the cap drops the oldest entries", () => {
    for (let i = 0; i < MAX_RECENTLY_VIEWED + 3; i++) {
      addRecentlyViewed({ slug: `article-${i}`, title: `Article ${i}` });
    }

    const list = getRecentlyViewed();
    expect(list).toHaveLength(MAX_RECENTLY_VIEWED);
    // newest first; the earliest-added entries (article-0, article-1, article-2) fell off
    expect(list[0]).toEqual({
      slug: `article-${MAX_RECENTLY_VIEWED + 2}`,
      title: `Article ${MAX_RECENTLY_VIEWED + 2}`,
    });
    expect(list.some((entry) => entry.slug === "article-0")).toBe(false);
  });
});

describe("robustness", () => {
  test("addRecentlyViewed with no slug is a no-op", () => {
    addRecentlyViewed({ title: "No slug here" });

    expect(getRecentlyViewed()).toEqual([]);
  });

  test("getRecentlyViewed returns [] when nothing is stored", () => {
    expect(getRecentlyViewed()).toEqual([]);
  });

  test("getRecentlyViewed returns [] on malformed JSON", () => {
    localStorage.setItem("recentlyViewed", "not json");

    expect(getRecentlyViewed()).toEqual([]);
  });
});
