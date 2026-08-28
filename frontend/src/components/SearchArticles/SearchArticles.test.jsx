import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AuthProvider from "../../context/AuthContext";
import FeedProvider from "../../context/FeedContext";
import FeedToggler from "../FeedToggler";
import SearchArticles from "./SearchArticles";

function renderSearch() {
  return render(
    <AuthProvider>
      <FeedProvider>
        <SearchArticles />
        <FeedToggler />
      </FeedProvider>
    </AuthProvider>,
  );
}

describe("SearchArticles", () => {
  // AC-084: a search input is available and submitting a keyword switches
  // to a search view for that keyword.
  test("submitting a keyword switches the feed into search mode", async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.type(screen.getByLabelText("Search articles"), "dragons");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(
      screen.getByText('Search results for "dragons"'),
    ).toBeInTheDocument();
  });

  // AC-081: submitting an empty search does not error.
  test("submitting an empty search does not throw", async () => {
    const user = userEvent.setup();
    renderSearch();

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByText('Search results for ""')).toBeInTheDocument();
  });
});
