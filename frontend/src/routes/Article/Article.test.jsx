import { MemoryRouter, Route, Routes } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import AuthProvider from "../../context/AuthContext";
import Article from "./Article";

function renderArticle(article) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[{ pathname: `/article/${article.slug}`, state: article }]}>
        <Routes>
          <Route path="/article/:slug" element={<Article />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

function makeArticle(overrides = {}) {
  return {
    slug: "a-slug",
    title: "A Title",
    // Empty body avoids rendering <Markdown>, which errors under this
    // vitest/jsdom setup independent of anything under test here.
    body: "",
    tagList: [],
    createdAt: new Date("2020-01-01"),
    author: { username: "jane" },
    favorited: false,
    favoritesCount: 0,
    following: false,
    ...overrides,
  };
}

describe("Article detail page", () => {
  // AC-086: an article with an image renders a cover image on the detail page.
  test("renders a cover image when the article has one", () => {
    renderArticle(makeArticle({ image: "http://x/img.png" }));

    const img = screen.getByRole("img", { name: "A Title" });
    expect(img).toHaveAttribute("src", "http://x/img.png");
  });

  // AC-087: an article with no image renders no cover image, and no placeholder.
  test("renders no cover image when the article has none", () => {
    renderArticle(makeArticle());

    expect(screen.queryByRole("img", { name: "A Title" })).not.toBeInTheDocument();
  });
});
