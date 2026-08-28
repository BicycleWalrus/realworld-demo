import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFeedContext } from "../../context/FeedContext";
import ArticleSearch from "./ArticleSearch";

vi.mock("../../context/FeedContext", () => ({ useFeedContext: vi.fn() }));

beforeEach(() => {
  useFeedContext.mockReset();
});

test("submitting the search form sets the trimmed keyword", async () => {
  const setKeyword = vi.fn();
  useFeedContext.mockReturnValue({ keyword: "", setKeyword, tabName: "global", tagName: "" });
  const user = userEvent.setup();

  render(<ArticleSearch />);
  await user.type(screen.getByPlaceholderText("Search articles..."), "  fire  ");
  await user.click(screen.getByRole("button", { name: "Search" }));

  expect(setKeyword).toHaveBeenCalledWith("fire");
});

// AC-102: while a tag filter is active, the active-filter display shows
// both the keyword and the tag together.
test("shows the active keyword together with the active tag filter", () => {
  useFeedContext.mockReturnValue({
    keyword: "fire",
    setKeyword: vi.fn(),
    tabName: "tag",
    tagName: "dragons",
  });

  const { container } = render(<ArticleSearch />);

  expect(container.textContent).toContain('Showing results for "fire"');
  expect(container.textContent).toContain("#dragons");
});

// No tag is active (global feed) - only the keyword itself is shown.
test("shows only the active keyword when no tag filter is active", () => {
  useFeedContext.mockReturnValue({
    keyword: "fire",
    setKeyword: vi.fn(),
    tabName: "global",
    tagName: "",
  });

  const { container } = render(<ArticleSearch />);

  expect(container.textContent).toContain('Showing results for "fire"');
  expect(container.textContent).not.toContain("#");
});

// AC-103: the clear control removes only the keyword filter.
test("the clear control resets the keyword to empty", async () => {
  const setKeyword = vi.fn();
  useFeedContext.mockReturnValue({ keyword: "fire", setKeyword, tabName: "tag", tagName: "dragons" });
  const user = userEvent.setup();

  render(<ArticleSearch />);
  await user.click(screen.getByRole("button", { name: "Clear search" }));

  expect(setKeyword).toHaveBeenCalledWith("");
});

test("no active-filter line is shown when there is no keyword", () => {
  useFeedContext.mockReturnValue({ keyword: "", setKeyword: vi.fn(), tabName: "global", tagName: "" });

  render(<ArticleSearch />);

  expect(screen.queryByText(/Showing results for/)).not.toBeInTheDocument();
});
