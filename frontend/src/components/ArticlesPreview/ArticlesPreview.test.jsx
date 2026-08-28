import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuthProvider from "../../context/AuthContext";
import ArticlesPreview from "./ArticlesPreview";

function makeArticle(overrides = {}) {
  return {
    slug: "a-slug",
    title: "A title",
    description: "A description",
    tagList: [],
    createdAt: "2020-01-01T00:00:00.000Z",
    author: { username: "author" },
    favorited: false,
    favoritesCount: 0,
    ...overrides,
  };
}

function renderPreview(articles) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ArticlesPreview articles={articles} loading={false} updateArticles={() => {}} />
      </AuthProvider>
    </MemoryRouter>,
  );
}

// AC-084: a set cover image is displayed on the article preview card.
it("renders the cover image on a preview card when the article has one", () => {
  renderPreview([makeArticle({ image: "https://example.com/cover.png" })]);

  const img = screen.getByRole("img", { name: "A title" });
  expect(img).toHaveAttribute("src", "https://example.com/cover.png");
});

// AC-085: with no image, the preview card renders exactly as before.
it("renders no image on a preview card when the article has none", () => {
  renderPreview([makeArticle()]);

  expect(screen.queryByRole("img", { name: "A title" })).not.toBeInTheDocument();
});
