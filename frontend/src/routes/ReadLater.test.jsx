import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ReadLater from "./ReadLater";

// getReadLater is the only I/O boundary this page touches - mocked so the
// page's own render/fetch logic is what's exercised, not real network
// calls.
vi.mock("../services/getReadLater");
import getReadLater from "../services/getReadLater";

// useAuth is mocked (same pattern as ArticlesPreview.test.jsx /
// AuthorInfo.test.jsx) so both the authenticated and anonymous cases can
// be forced without a real login flow.
vi.mock("../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuth: vi.fn() };
});
import { useAuth } from "../context/AuthContext";

function renderReadLater() {
  return render(
    <MemoryRouter initialEntries={["/read-later"]}>
      <ReadLater />
    </MemoryRouter>,
  );
}

function baseArticle(overrides = {}) {
  return {
    slug: "a-slug",
    title: "A Slug",
    description: "d",
    author: { username: "jane", bio: null, image: null, following: false, followersCount: 0 },
    createdAt: "2020-01-01T00:00:00.000Z",
    favorited: false,
    favoritesCount: 0,
    tagList: [],
    readLater: true,
    ...overrides,
  };
}

beforeEach(() => {
  getReadLater.mockReset();
});

// AC-118/AC-119: an authenticated user sees their own saved articles.
describe("ReadLater — authenticated", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ headers: { Authorization: "Bearer token" }, isAuth: true });
  });

  test("renders the user's saved articles from getReadLater", async () => {
    getReadLater.mockResolvedValue({
      articles: [baseArticle({ slug: "saved-1", title: "Saved One" })],
      articlesCount: 1,
    });

    renderReadLater();

    expect(await screen.findByText("Saved One")).toBeInTheDocument();
    expect(getReadLater).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
    );
  });

  test("renders an empty-state message when nothing is saved", async () => {
    getReadLater.mockResolvedValue({ articles: [], articlesCount: 0 });

    renderReadLater();

    expect(
      await screen.findByText("You haven't saved any articles yet."),
    ).toBeInTheDocument();
  });
});

// AC-118/AC-119: the read-later list is private - an unauthenticated
// visitor sees a sign-in prompt, not saved-article data, and no fetch is
// made.
describe("ReadLater — anonymous", () => {
  test("shows a sign-in prompt instead of the list and does not fetch", async () => {
    useAuth.mockReturnValue({ headers: null, isAuth: false });

    renderReadLater();

    expect(await screen.findByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Sign in").closest("a")).toHaveAttribute("href", "/login");
    await waitFor(() => expect(getReadLater).not.toHaveBeenCalled());
  });
});
