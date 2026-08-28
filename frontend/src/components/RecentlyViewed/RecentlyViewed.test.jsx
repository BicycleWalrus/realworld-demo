import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { addRecentlyViewed } from "../../helpers/recentlyViewed";
import RecentlyViewed from "./RecentlyViewed";

beforeEach(() => {
  localStorage.clear();
});

function renderWidget() {
  return render(
    <MemoryRouter>
      <RecentlyViewed />
    </MemoryRouter>,
  );
}

// AC-139: renders the visitor's history, most-recent first, as links back
// to the article.
describe("RecentlyViewed - with history", () => {
  test("renders titles as links to /article/:slug, newest first", () => {
    addRecentlyViewed({ slug: "first", title: "First Article" });
    addRecentlyViewed({ slug: "second", title: "Second Article" });

    renderWidget();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveTextContent("Second Article");
    expect(links[0]).toHaveAttribute("href", "/article/second");
    expect(links[1]).toHaveTextContent("First Article");
    expect(links[1]).toHaveAttribute("href", "/article/first");
  });
});

// AC-139: an empty history renders no widget at all - not an empty box.
describe("RecentlyViewed - with no history", () => {
  test("renders nothing", () => {
    const { container } = renderWidget();

    expect(container).toBeEmptyDOMElement();
  });
});
