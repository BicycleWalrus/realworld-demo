import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthProvider from "../../context/AuthContext";
import { getRecentlyViewed } from "../../helpers/recentlyViewed";
import Article from "./Article";

beforeEach(() => {
  localStorage.clear();
});

function renderArticle(articleState) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: "/article/a-slug", state: articleState }]}
    >
      <AuthProvider>
        <Routes>
          <Route path="/article/:slug" element={<Article />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function makeArticleState(overrides = {}) {
  return {
    title: "A title",
    // Left empty so the markdown body isn't rendered - these tests only
    // exercise the cover image, not the markdown-to-jsx rendering path.
    body: "",
    tagList: [],
    createdAt: "2020-01-01T00:00:00.000Z",
    author: { username: "author", followersCount: 0, following: false },
    favorited: false,
    favoritesCount: 0,
    ...overrides,
  };
}

// AC-085: when an article has a cover image, it's displayed on the detail page.
it("renders the cover image when the article has one", () => {
  renderArticle(makeArticleState({ image: "https://example.com/cover.png" }));

  const img = screen.getByRole("img", { name: "A title" });
  expect(img).toHaveAttribute("src", "https://example.com/cover.png");
});

// AC-086: with no image, the layout renders exactly as before - no broken
// image and no image element at all.
it("renders no image when the article has none", () => {
  renderArticle(makeArticleState());

  expect(screen.queryByRole("img", { name: "A title" })).not.toBeInTheDocument();
});

// An empty body has no headings, so no table of contents should render.
// (A non-empty body would additionally exercise markdown-to-jsx, which
// hits a separate, pre-existing markdown-to-jsx/vitest-SSR incompatibility
// unrelated to this feature - see extractHeadings.test.js for heading
// extraction coverage against real Markdown bodies.)
it("renders no table of contents when the article has no headings", () => {
  renderArticle(makeArticleState());

  expect(
    screen.queryByRole("navigation", { name: "Table of contents" }),
  ).not.toBeInTheDocument();
});

// AC-116
it("records the article as recently viewed when opened", () => {
  renderArticle(makeArticleState());

  expect(getRecentlyViewed()).toEqual([
    { slug: "a-slug", title: "A title" },
  ]);
});
