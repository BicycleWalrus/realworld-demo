import axios from "axios";
import setArticle from "./setArticle";

vi.mock("axios");

describe("setArticle", () => {
  beforeEach(() => {
    axios.mockReset();
    axios.mockResolvedValue({ data: { article: { slug: "a-slug" } } });
  });

  // AC-080: a provided image URL is included in the request payload.
  test("includes image in the request payload when provided", async () => {
    await setArticle({
      title: "t",
      description: "d",
      body: "b",
      tagList: [],
      image: "http://x/img.png",
      headers: {},
    });

    const [{ data }] = axios.mock.calls[0];
    expect(data.article.image).toBe("http://x/img.png");
  });

  // AC-081: omitting image does not break the request.
  test("omits image when not provided", async () => {
    await setArticle({ title: "t", description: "d", body: "b", tagList: [], headers: {} });

    const [{ data }] = axios.mock.calls[0];
    expect(data.article.image).toBeUndefined();
  });
});
