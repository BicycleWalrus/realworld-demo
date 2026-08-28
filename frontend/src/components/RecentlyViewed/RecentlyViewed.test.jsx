import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { recordView } from "../../helpers/recentlyViewed";
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

describe("RecentlyViewed", () => {
  it("renders nothing when no articles have been viewed", () => {
    const { container } = renderWidget();

    expect(container).toBeEmptyDOMElement();
  });

  it("renders viewed articles most-recently-viewed first", () => {
    recordView({ slug: "first", title: "First Article" });
    recordView({ slug: "second", title: "Second Article" });

    renderWidget();

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual([
      "Second Article",
      "First Article",
    ]);
    expect(links[0]).toHaveAttribute("href", "/article/second");
  });
});
