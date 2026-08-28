import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { expect, test, vi } from "vitest";
import * as AuthContext from "../../context/AuthContext";
import Article from "./Article";

// markdown-to-jsx isn't the concern of this test (cover image rendering
// is); stubbing it avoids an unrelated SSR-transform incompatibility with
// the real package under vitest.
vi.mock("markdown-to-jsx", () => ({ default: ({ children }) => <div>{children}</div> }));

const author = { username: "jane", image: null };

function renderArticle(article) {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({
    isAuth: true,
    headers: {},
    loggedUser: { username: "jane" },
  });

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

test("renders the cover image when the article has one", () => {
  renderArticle({
    title: "Has Image",
    body: "body",
    tagList: [],
    author,
    image: "https://example.com/cover.png",
  });

  const img = screen.getByRole("img", { name: "Has Image" });
  expect(img).toHaveAttribute("src", "https://example.com/cover.png");
});

test("renders no image element when the article has none", () => {
  renderArticle({ title: "No Image", body: "body", tagList: [], author });

  expect(screen.queryByRole("img", { name: "No Image" })).not.toBeInTheDocument();
});

test("hides the image on a load error instead of crashing", () => {
  renderArticle({
    title: "Broken Image",
    body: "body",
    tagList: [],
    author,
    image: "https://example.com/broken.png",
  });

  const img = screen.getByRole("img", { name: "Broken Image" });

  expect(() => fireEvent.error(img)).not.toThrow();
  expect(img).toHaveStyle({ display: "none" });
});
