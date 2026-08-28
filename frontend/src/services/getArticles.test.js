import axios from "axios";
import getArticles from "./getArticles";

vi.mock("axios");

beforeEach(() => {
  axios.mockReset();
  axios.mockResolvedValue({ data: { articles: [], articlesCount: 0 } });
});

describe("getArticles - keyword query building (REQ-056/REQ-057)", () => {
  // AC-096/AC-098: a keyword is appended to every location that maps to
  // the article-listing endpoint, alongside whichever other filter is
  // already in play for that location.
  test.each([
    ["global", "api/articles?limit=3&&offset=0&&keyword=dragons"],
    ["tag", "api/articles?tag=fire&&limit=3&&offset=0&&keyword=dragons"],
    ["profile", "api/articles?author=jane&&limit=3&&offset=0&&keyword=dragons"],
    ["favorites", "api/articles?favorited=jane&&limit=3&&offset=0&&keyword=dragons"],
  ])("appends the keyword for the %s location", async (location, expectedUrl) => {
    await getArticles({
      headers: null,
      keyword: "dragons",
      location,
      tagName: "fire",
      username: "jane",
    });

    expect(axios).toHaveBeenCalledWith(expect.objectContaining({ url: expectedUrl }));
  });

  // The personalized feed endpoint (REQ-018) doesn't implement keyword
  // search, so no keyword param is ever sent to it.
  test("omits the keyword for the personalized feed location", async () => {
    await getArticles({ headers: null, keyword: "dragons", location: "feed" });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({ url: "api/articles/feed?limit=3&&offset=0" }),
    );
  });

  // AC-099: an absent, empty, or whitespace-only keyword produces the same
  // URL as if no keyword had been supplied at all.
  test.each([[undefined], [""], ["   "]])("omits the keyword param when keyword is %j", async (keyword) => {
    await getArticles({ headers: null, keyword, location: "global" });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({ url: "api/articles?limit=3&&offset=0" }),
    );
  });

  test("URL-encodes special characters in the keyword", async () => {
    await getArticles({ headers: null, keyword: "a b&c", location: "global" });

    expect(axios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: `api/articles?limit=3&&offset=0&&keyword=${encodeURIComponent("a b&c")}`,
      }),
    );
  });
});
