import { getRecentlyViewed, recordView } from "./recentlyViewed";

beforeEach(() => {
  localStorage.clear();
});

describe("getRecentlyViewed", () => {
  it("returns an empty list when nothing has been viewed yet", () => {
    expect(getRecentlyViewed()).toEqual([]);
  });

  it("returns an empty list if the stored value is corrupted", () => {
    localStorage.setItem("recentlyViewed", "not valid json");

    expect(getRecentlyViewed()).toEqual([]);
  });
});

describe("recordView", () => {
  it("adds a viewed article to the front of the list", () => {
    recordView({ slug: "first-article", title: "First Article" });

    expect(getRecentlyViewed()).toEqual([
      { slug: "first-article", title: "First Article" },
    ]);
  });

  it("puts the most recently viewed article first", () => {
    recordView({ slug: "a", title: "A" });
    recordView({ slug: "b", title: "B" });

    expect(getRecentlyViewed()).toEqual([
      { slug: "b", title: "B" },
      { slug: "a", title: "A" },
    ]);
  });

  it("moves a re-viewed article to the front instead of duplicating it", () => {
    recordView({ slug: "a", title: "A" });
    recordView({ slug: "b", title: "B" });
    recordView({ slug: "a", title: "A" });

    expect(getRecentlyViewed()).toEqual([
      { slug: "a", title: "A" },
      { slug: "b", title: "B" },
    ]);
  });

  it("caps the list at 5 entries, dropping the oldest", () => {
    for (const slug of ["a", "b", "c", "d", "e", "f"]) {
      recordView({ slug, title: slug.toUpperCase() });
    }

    const result = getRecentlyViewed();

    expect(result).toHaveLength(5);
    expect(result[0]).toEqual({ slug: "f", title: "F" });
    expect(result.find((entry) => entry.slug === "a")).toBeUndefined();
  });
});
