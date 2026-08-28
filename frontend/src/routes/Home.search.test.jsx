import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Home from "./Home";
import HomeArticles from "./HomeArticles";

// getArticles and getTags are the I/O boundaries this page touches for this
// test - mocked so the search-tab wiring (FeedContext -> FeedToggler ->
// HomeArticles -> getArticles) is what's exercised, not real network calls.
vi.mock("../services/getArticles");
import getArticles from "../services/getArticles";

vi.mock("../services/getTags");
import getTags from "../services/getTags";

// useAuth is mocked (same pattern as AuthorInfo.test.jsx / ThemeContext.test.jsx)
// so the anonymous, global-feed-by-default case is forced without a real
// login flow.
vi.mock("../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuth: vi.fn() };
});
import { useAuth } from "../context/AuthContext";

function renderHome() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Home />}>
          <Route index element={<HomeArticles />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const article = {
  slug: "dragon-tale",
  title: "Dragon Tale",
  description: "a story about dragons",
  body: "b",
  tagList: [],
  author: {
    username: "jane",
    bio: null,
    image: null,
    following: false,
    followersCount: 0,
  },
  createdAt: "2020-01-01T00:00:00.000Z",
  favorited: false,
  favoritesCount: 0,
};

beforeEach(() => {
  useAuth.mockReturnValue({
    headers: null,
    isAuth: false,
    loggedUser: { username: "" },
  });
  getTags.mockReset().mockResolvedValue([]);
  getArticles.mockReset().mockResolvedValue({ articles: [], articlesCount: 0 });
});

// REQ-057/REQ-058: submitting a keyword in the search input sets an
// independent "search" feed tab, fetches via getArticles for that tab, and
// renders the matching results.
describe("search input - submitting a keyword", () => {
  test("fetches via the search tab and renders results", async () => {
    renderHome();

    // Initial mount fetches the (anonymous-default) Global Feed.
    await waitFor(() =>
      expect(getArticles).toHaveBeenCalledWith(
        expect.objectContaining({ location: "global", tabName: "global" }),
      ),
    );

    getArticles.mockResolvedValueOnce({ articles: [article], articlesCount: 1 });

    fireEvent.change(screen.getByPlaceholderText("Search articles"), {
      target: { value: "dragons" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(getArticles).toHaveBeenCalledWith(
        expect.objectContaining({
          location: "search",
          tabName: "search",
          searchTerm: "dragons",
        }),
      ),
    );

    expect(await screen.findByText("Dragon Tale")).toBeInTheDocument();
    // the active-search pill shows the submitted term
    expect(screen.getByText("dragons")).toBeInTheDocument();
  });
});

// REQ-060: submitting an empty/whitespace-only search falls back to the
// Global Feed (full listing) rather than an empty/error search tab. Starts
// from an active search (not already-global) so the fallback is an actual
// state transition, not a no-op.
describe("search input - submitting a blank term after a real search", () => {
  test("falls back to the Global Feed", async () => {
    renderHome();

    await waitFor(() =>
      expect(getArticles).toHaveBeenCalledWith(
        expect.objectContaining({ location: "global", tabName: "global" }),
      ),
    );

    getArticles.mockResolvedValueOnce({ articles: [article], articlesCount: 1 });
    const input = screen.getByPlaceholderText("Search articles");
    fireEvent.change(input, { target: { value: "dragons" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(getArticles).toHaveBeenCalledWith(
        expect.objectContaining({ location: "search", searchTerm: "dragons" }),
      ),
    );
    getArticles.mockClear();
    getArticles.mockResolvedValue({ articles: [], articlesCount: 0 });

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() =>
      expect(getArticles).toHaveBeenCalledWith(
        expect.objectContaining({
          location: "global",
          tabName: "global",
          searchTerm: "",
        }),
      ),
    );
  });
});
