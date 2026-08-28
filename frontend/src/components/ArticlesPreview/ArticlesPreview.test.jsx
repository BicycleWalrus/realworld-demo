import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import AuthProvider from "../../context/AuthContext";
import ArticlesPreview from "./ArticlesPreview";

function renderWithProviders(ui) {
  return render(
    <AuthProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </AuthProvider>,
  );
}

function makeArticle(overrides = {}) {
  return {
    slug: "a-slug",
    title: "A Title",
    description: "d",
    tagList: [],
    author: { username: "jane" },
    createdAt: new Date("2020-01-01"),
    favorited: false,
    favoritesCount: 0,
    ...overrides,
  };
}

describe("ArticlesPreview", () => {
  // AC-084: an article with an image renders a cover image on its preview card.
  test("renders a cover image when the article has one", () => {
    renderWithProviders(
      <ArticlesPreview articles={[makeArticle({ image: "http://x/img.png" })]} updateArticles={() => {}} />,
    );

    const img = screen.getByRole("img", { name: "A Title" });
    expect(img).toHaveAttribute("src", "http://x/img.png");
  });

  // AC-085: an article with no image renders no cover image, and no placeholder.
  test("renders no cover image when the article has none", () => {
    renderWithProviders(<ArticlesPreview articles={[makeArticle()]} updateArticles={() => {}} />);

    expect(screen.queryByRole("img", { name: "A Title" })).not.toBeInTheDocument();
  });
});
