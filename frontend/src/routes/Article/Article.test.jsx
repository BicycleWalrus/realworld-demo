import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Article from "./Article";

// useAuth is mocked (same pattern as ArticlesPreview.test.jsx /
// ArticleEditorForm.test.jsx) so the page can render its author/action
// controls without a real login flow.
vi.mock("../../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuth: vi.fn() };
});
import { useAuth } from "../../context/AuthContext";

const author = {
  username: "jane",
  bio: null,
  image: null,
  following: false,
  followersCount: 0,
};

// `body` is intentionally left falsy (same pattern as AuthorInfo.test.jsx):
// rendering it would exercise the unrelated markdown-to-jsx pipeline, which
// these cover-image-focused tests don't need to cover.
function baseArticle(overrides = {}) {
  return {
    slug: "a-slug",
    title: "A Slug",
    body: "",
    tagList: [],
    author,
    createdAt: "2020-01-01T00:00:00.000Z",
    favorited: false,
    favoritesCount: 0,
    ...overrides,
  };
}

// Navigation state is supplied directly (REQ-043), so the page renders the
// given article without needing to mock the getArticle service.
function renderArticle(article) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: "/article/a-slug", state: article }]}
    >
      <Routes>
        <Route path="/article/:slug" element={<Article />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuth.mockReturnValue({
    headers: null,
    isAuth: false,
    loggedUser: { username: "someone-else" },
  });
});

// AC-109: the article detail page shows the cover image when the article
// has one, and shows no cover image element (or placeholder) when it does
// not, so the layout is unchanged from before this requirement existed.
describe("Article detail page cover image (REQ-078)", () => {
  test("renders the cover image when the article has one", () => {
    renderArticle(baseArticle({ image: "http://example.com/cover.png" }));

    const img = screen.getByRole("img", { name: "" });
    expect(img).toHaveAttribute("src", "http://example.com/cover.png");
  });

  test("renders no cover image when the article has none", () => {
    renderArticle(baseArticle());

    expect(screen.queryByRole("img", { name: "" })).not.toBeInTheDocument();
  });
});
