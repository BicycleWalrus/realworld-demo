import { fireEvent, render, screen } from "@testing-library/react";
import AuthProvider from "../../context/AuthContext";
import FeedProvider, { useFeedContext } from "../../context/FeedContext";
import ArticleSearch from "./ArticleSearch";

// Renders the context's current keyword so tests can assert what the
// feed will actually search for, without mounting the article list.
function SearchTermProbe() {
  const { searchTerm } = useFeedContext();
  return <div data-testid="search-term">{searchTerm}</div>;
}

function renderSearch() {
  return render(
    <AuthProvider>
      <FeedProvider>
        <ArticleSearch />
        <SearchTermProbe />
      </FeedProvider>
    </AuthProvider>,
  );
}

describe("ArticleSearch", () => {
  // AC-135: a search input is available, and submitting a keyword
  // applies it to the feed (REQ-062).
  it("submitting a keyword applies it, trimmed", () => {
    renderSearch();

    const input = screen.getByRole("searchbox", { name: /search articles/i });
    fireEvent.change(input, { target: { value: "  dragon  " } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByTestId("search-term")).toHaveTextContent("dragon");
  });

  // AC-137: a whitespace-only keyword applies no filter — the active
  // keyword is cleared rather than searched for.
  it("submitting only whitespace clears the keyword", () => {
    renderSearch();

    const input = screen.getByRole("searchbox", { name: /search articles/i });
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByTestId("search-term")).toHaveTextContent("");
  });

  it("clear removes an applied keyword", () => {
    renderSearch();

    const input = screen.getByRole("searchbox", { name: /search articles/i });
    fireEvent.change(input, { target: { value: "dragon" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByTestId("search-term")).toHaveTextContent("");
    expect(input).toHaveValue("");
  });
});
