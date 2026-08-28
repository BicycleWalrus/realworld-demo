import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it } from "vitest";
import { recordRecentlyViewed } from "../../helpers/recentlyViewed";
import RecentlyViewed from "./RecentlyViewed";

beforeEach(() => {
  localStorage.clear();
});

it("shows a fallback message when nothing has been viewed yet", () => {
  render(<RecentlyViewed />, { wrapper: MemoryRouter });

  expect(
    screen.getByText("No recently viewed articles yet."),
  ).toBeInTheDocument();
});

it("lists recently viewed articles most-recently-viewed first", () => {
  recordRecentlyViewed({ slug: "first-post", title: "First Post" });
  recordRecentlyViewed({ slug: "second-post", title: "Second Post" });

  render(<RecentlyViewed />, { wrapper: MemoryRouter });

  const links = screen.getAllByRole("link");

  expect(links).toHaveLength(2);
  expect(links[0]).toHaveTextContent("Second Post");
  expect(links[0]).toHaveAttribute("href", "/article/second-post");
  expect(links[1]).toHaveTextContent("First Post");
});
