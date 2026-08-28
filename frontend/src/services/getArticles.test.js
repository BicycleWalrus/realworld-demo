import axios from "axios";
import { beforeEach, expect, test, vi } from "vitest";
import getArticles from "./getArticles";

vi.mock("axios");

beforeEach(() => {
  axios.mockReset();
  axios.mockResolvedValue({ data: { articles: [], articlesCount: 0 } });
});

// A keyword containing characters that are meaningful in a URL/query
// string (&, #, +, spaces) must be encoded, or it corrupts the request.
test("search location URL-encodes the keyword", async () => {
  await getArticles({ location: "search", keyword: "cats & dogs" });

  const [{ url }] = axios.mock.calls[0];
  expect(url).toBe("api/articles?keyword=cats%20%26%20dogs&&limit=3&&offset=0");
});

test("tag location URL-encodes the tag name", async () => {
  await getArticles({ location: "tag", tagName: "c++ & friends" });

  const [{ url }] = axios.mock.calls[0];
  expect(url).toContain(encodeURIComponent("c++ & friends"));
});

test("profile location URL-encodes the username", async () => {
  await getArticles({ location: "profile", username: "jane doe" });

  const [{ url }] = axios.mock.calls[0];
  expect(url).toContain(encodeURIComponent("jane doe"));
});
