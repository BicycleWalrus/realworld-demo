import { renderHook, waitFor } from "@testing-library/react";
import { useAuth } from "../context/AuthContext";
import getArticles from "../services/getArticles";
import useArticles from "./useArticles";

vi.mock("../services/getArticles");
vi.mock("../context/AuthContext", () => ({ useAuth: vi.fn() }));

beforeEach(() => {
  getArticles.mockReset();
  getArticles.mockResolvedValue({ articles: [], articlesCount: 0 });
  useAuth.mockReset();
  useAuth.mockReturnValue({ headers: null });
});

// AC-102: submitting a keyword while a tag filter is already active
// re-fetches with both filters applied.
test("re-fetches with both the tag and the new keyword when the keyword changes", async () => {
  const { rerender } = renderHook(
    ({ keyword }) => useArticles({ keyword, location: "tag", tabName: "tag", tagName: "dragons" }),
    { initialProps: { keyword: "" } },
  );

  await waitFor(() =>
    expect(getArticles).toHaveBeenCalledWith(
      expect.objectContaining({ location: "tag", tagName: "dragons", keyword: "" }),
    ),
  );

  rerender({ keyword: "fire" });

  await waitFor(() =>
    expect(getArticles).toHaveBeenLastCalledWith(
      expect.objectContaining({ location: "tag", tagName: "dragons", keyword: "fire" }),
    ),
  );
});

// AC-103: clearing the keyword re-fetches using only the tag filter that
// remains active, without an error.
test("re-fetches with only the tag filter once the keyword is cleared", async () => {
  const { rerender } = renderHook(
    ({ keyword }) => useArticles({ keyword, location: "tag", tabName: "tag", tagName: "dragons" }),
    { initialProps: { keyword: "fire" } },
  );

  await waitFor(() => expect(getArticles).toHaveBeenCalledWith(expect.objectContaining({ keyword: "fire" })));

  rerender({ keyword: "" });

  await waitFor(() =>
    expect(getArticles).toHaveBeenLastCalledWith(
      expect.objectContaining({ location: "tag", tagName: "dragons", keyword: "" }),
    ),
  );
});
