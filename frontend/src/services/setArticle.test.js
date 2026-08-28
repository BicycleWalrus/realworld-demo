import axios from "axios";
import { beforeEach, expect, test, vi } from "vitest";
import setArticle from "./setArticle";

vi.mock("axios");

beforeEach(() => {
  axios.mockReset();
  axios.mockResolvedValue({ data: { article: { slug: "a-slug" } } });
});

test("request payload includes the image when provided", async () => {
  await setArticle({
    body: "b",
    description: "d",
    image: "https://example.com/cover.png",
    tagList: [],
    title: "t",
  });

  const [{ data }] = axios.mock.calls[0];
  expect(data.article.image).toBe("https://example.com/cover.png");
});

test("request payload omits/undefined image when not provided", async () => {
  await setArticle({ body: "b", description: "d", tagList: [], title: "t" });

  const [{ data }] = axios.mock.calls[0];
  expect(data.article.image).toBeUndefined();
});
