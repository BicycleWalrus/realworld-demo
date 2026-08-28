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
