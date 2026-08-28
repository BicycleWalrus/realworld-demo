import axios from "axios";
import setArticle from "./setArticle";

vi.mock("axios");

beforeEach(() => {
  axios.mockReset();
  axios.mockResolvedValue({ data: { article: { slug: "a-slug" } } });
});

// REQ-069/AC-100: creating an article carries the `published` flag through
// to the request body, so the caller (e.g. the "Save as Draft" control)
// controls whether the article is created as a draft or published.
describe("setArticle published flag", () => {
  test("published:false is sent through to the request body", async () => {
    await setArticle({
      body: "b",
      description: "d",
      headers: { Authorization: "Bearer token" },
      published: false,
      tagList: [],
      title: "t",
    });

    expect(axios).toHaveBeenCalledWith({
      data: { article: { title: "t", description: "d", body: "b", tagList: [], published: false } },
      headers: { Authorization: "Bearer token" },
      method: "POST",
      url: "api/articles",
    });
  });

  test("published:true is sent through to the request body", async () => {
    await setArticle({
      body: "b",
      description: "d",
      headers: { Authorization: "Bearer token" },
      published: true,
      tagList: [],
      title: "t",
    });

    expect(axios).toHaveBeenCalledWith({
      data: { article: { title: "t", description: "d", body: "b", tagList: [], published: true } },
      headers: { Authorization: "Bearer token" },
      method: "POST",
      url: "api/articles",
    });
  });

  test("an existing slug still PUTs to the article's own URL, carrying published through", async () => {
    await setArticle({
      body: "b",
      description: "d",
      headers: { Authorization: "Bearer token" },
      published: true,
      slug: "a-slug",
      tagList: [],
      title: "t",
    });

    expect(axios).toHaveBeenCalledWith({
      data: { article: { title: "t", description: "d", body: "b", tagList: [], published: true } },
      headers: { Authorization: "Bearer token" },
      method: "PUT",
      url: "api/articles/a-slug",
    });
  });
});
