import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ArticlesPreview from "./ArticlesPreview";

// FavButton (rendered per article) reads useAuth internally - mocked so
// these draft-badge tests don't depend on real auth state.
vi.mock("../../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuth: vi.fn() };
});
import { useAuth } from "../../context/AuthContext";

const author = { username: "jane", bio: null, image: null, following: false, followersCount: 0 };

function baseArticle(overrides = {}) {
  return {
    slug: "a-slug",
    title: "A Slug",
    description: "d",
    author,
    createdAt: "2020-01-01T00:00:00.000Z",
    favorited: false,
    favoritesCount: 0,
    tagList: [],
    ...overrides,
  };
}

function renderPreview(articles) {
  return render(
    <MemoryRouter>
      <ArticlesPreview articles={articles} loading={false} updateArticles={vi.fn()} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuth.mockReturnValue({ headers: null, isAuth: false });
});

// AC-102: an author's own drafts are visibly marked so they can tell them
// apart from published articles in a listing.
describe("ArticlesPreview draft marker", () => {
  test("renders a Draft badge for an unpublished article", () => {
    renderPreview([baseArticle({ published: false })]);

    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  test("does not render a Draft badge for a published article", () => {
    renderPreview([baseArticle({ published: true })]);

    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
  });
});

// AC-109: a cover image is shown on the preview card when the article has
// one, and no cover image element (or placeholder) is shown when it does
// not, so the layout is unchanged for articles without a cover image.
describe("ArticlesPreview cover image (REQ-078)", () => {
  test("renders the cover image when the article has one", () => {
    renderPreview([baseArticle({ image: "http://example.com/cover.png" })]);

    const img = screen.getByRole("img", { name: "" });
    expect(img).toHaveAttribute("src", "http://example.com/cover.png");
  });

  // Queries by the cover-specific class rather than role "img" - a preview
  // also renders the author's Avatar <img>, which must be unaffected.
  test("renders no cover image when the article has none", () => {
    const { container } = renderPreview([baseArticle({ image: null })]);

    expect(container.querySelector(".article-cover-preview")).not.toBeInTheDocument();
  });
});
