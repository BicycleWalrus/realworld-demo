import axios from "axios";
import getArticles from "./getArticles";

vi.mock("axios");

beforeEach(() => {
  axios.mockReset();
  axios.mockResolvedValue({ data: { articles: [], articlesCount: 0 } });
});

// AC-088/AC-089: the "search" feed location builds a search query string
// with the keyword URL-encoded, alongside the existing 3/page pagination
// params (REQ-031) — unchanged for every other existing location.
describe("getArticles search location", () => {
  test("builds an encoded search query string with default paging", async () => {
    await getArticles({ location: "search", searchTerm: "dragons & co" });

    expect(axios).toHaveBeenCalledWith({
      url: "api/articles?search=dragons%20%26%20co&&limit=3&&offset=0",
      headers: undefined,
    });
  });

  test("carries a custom page/limit through, same as other locations", async () => {
    await getArticles({ location: "search", searchTerm: "cats", limit: 3, page: 2 });

    expect(axios).toHaveBeenCalledWith({
      url: "api/articles?search=cats&&limit=3&&offset=2",
      headers: undefined,
    });
  });
});

// Existing locations are unchanged by the addition of "search".
describe("getArticles existing locations", () => {
  test.each([
    ["global", {}, "api/articles?limit=3&&offset=0"],
    ["tag", { tagName: "dragons" }, "api/articles?tag=dragons&&limit=3&&offset=0"],
    ["profile", { username: "jane" }, "api/articles?author=jane&&limit=3&&offset=0"],
    ["favorites", { username: "jane" }, "api/articles?favorited=jane&&limit=3&&offset=0"],
    ["feed", {}, "api/articles/feed?limit=3&&offset=0"],
  ])("location %s builds an unchanged url", async (location, extra, expectedUrl) => {
    await getArticles({ location, ...extra });

    expect(axios).toHaveBeenCalledWith({ url: expectedUrl, headers: undefined });
  });
});

// AC-140/AC-141: the "tag" location accepts either a single tag name
// (string, unchanged URL) or two-or-more tag names (array, repeated `tag=`
// params) for the multi-tag AND filter (REQ-109/REQ-110).
describe("getArticles tag location - single vs multi-tag", () => {
  test("a single tag name (string) builds the same URL as today", async () => {
    await getArticles({ location: "tag", tagName: "dragons" });

    expect(axios).toHaveBeenCalledWith({
      url: "api/articles?tag=dragons&&limit=3&&offset=0",
      headers: undefined,
    });
  });

  test("an array of two or more tag names builds repeated tag= params", async () => {
    await getArticles({ location: "tag", tagName: ["a", "b"] });

    expect(axios).toHaveBeenCalledWith({
      url: "api/articles?tag=a&&tag=b&&limit=3&&offset=0",
      headers: undefined,
    });
  });

  test("carries a custom page/limit through with an array of tags", async () => {
    await getArticles({ location: "tag", tagName: ["a", "b", "c"], limit: 3, page: 2 });

    expect(axios).toHaveBeenCalledWith({
      url: "api/articles?tag=a&&tag=b&&tag=c&&limit=3&&offset=2",
      headers: undefined,
    });
  });
});

// REQ-061: the "top" feed tab is selected via `sort=top` on the existing
// GET /api/articles listing (no new route), using the same 3/page paging.
describe("getArticles top location", () => {
  test("builds a sort=top query string with default paging", async () => {
    await getArticles({ location: "top" });

    expect(axios).toHaveBeenCalledWith({
      url: "api/articles?sort=top&&limit=3&&offset=0",
      headers: undefined,
    });
  });

  test("carries a custom page/limit through, same as other locations", async () => {
    await getArticles({ location: "top", limit: 3, page: 2 });

    expect(axios).toHaveBeenCalledWith({
      url: "api/articles?sort=top&&limit=3&&offset=2",
      headers: undefined,
    });
  });
});
