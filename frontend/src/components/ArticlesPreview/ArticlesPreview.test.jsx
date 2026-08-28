import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test } from "vitest";
import AuthProvider from "../../context/AuthContext";
import ArticlesPreview from "./ArticlesPreview";

const author = { username: "jane", image: null };

function renderPreview(articles) {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ArticlesPreview articles={articles} updateArticles={() => {}} />
      </AuthProvider>
    </MemoryRouter>,
  );
}

// AC-094: an article with an image renders it; one without renders no <img>.
test("renders the cover image when the article has one", () => {
  renderPreview([
    {
      slug: "with-image",
      title: "Has Image",
      description: "d",
      author,
      image: "https://example.com/cover.png",
    },
  ]);

  const img = screen.getByRole("img", { name: "Has Image" });
  expect(img).toHaveAttribute("src", "https://example.com/cover.png");
});

test("renders no image element when the article has none", () => {
  renderPreview([
    { slug: "no-image", title: "No Image", description: "d", author },
  ]);

  expect(screen.queryByRole("img", { name: "No Image" })).not.toBeInTheDocument();
});

// AC-095: a broken/unreachable image URL doesn't crash rendering; the
// element is hidden rather than left as a broken-image glyph.
test("hides the image on a load error instead of crashing", () => {
  renderPreview([
    {
      slug: "broken-image",
      title: "Broken Image",
      description: "d",
      author,
      image: "https://example.com/broken.png",
    },
  ]);

  const img = screen.getByRole("img", { name: "Broken Image" });

  expect(() => fireEvent.error(img)).not.toThrow();
  expect(img).toHaveStyle({ display: "none" });
});
