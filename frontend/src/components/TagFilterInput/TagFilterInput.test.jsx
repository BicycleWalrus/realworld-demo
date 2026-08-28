import { fireEvent, render, screen } from "@testing-library/react";
import AuthProvider from "../../context/AuthContext";
import FeedProvider, { useFeedContext } from "../../context/FeedContext";
import TagFilterInput from "./TagFilterInput";

// Renders the context's current tag filter so tests can assert what the
// feed will actually request, without mounting the article list.
function FilterTagsProbe() {
  const { filterTags } = useFeedContext();
  return <div data-testid="filter-tags">{filterTags.join(",")}</div>;
}

function renderTagFilter() {
  return render(
    <AuthProvider>
      <FeedProvider>
        <TagFilterInput />
        <FilterTagsProbe />
      </FeedProvider>
    </AuthProvider>,
  );
}

describe("TagFilterInput", () => {
  // AC-140: submitting several comma-separated tags applies them as a
  // multi-tag (AND) filter (REQ-063).
  it("submitting comma-separated tags applies them, trimmed", () => {
    renderTagFilter();

    const input = screen.getByRole("textbox", { name: /filter articles by tags/i });
    fireEvent.change(input, { target: { value: " dragons ,  training " } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));

    expect(screen.getByTestId("filter-tags")).toHaveTextContent("dragons,training");
  });

  // An empty or whitespace-only entry clears the filter rather than
  // searching for an empty tag.
  it("submitting only separators clears the filter", () => {
    renderTagFilter();

    const input = screen.getByRole("textbox", { name: /filter articles by tags/i });
    fireEvent.change(input, { target: { value: " , , " } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));

    expect(screen.getByTestId("filter-tags")).toHaveTextContent("");
  });

  it("clear removes an applied filter", () => {
    renderTagFilter();

    const input = screen.getByRole("textbox", { name: /filter articles by tags/i });
    fireEvent.change(input, { target: { value: "dragons" } });
    fireEvent.click(screen.getByRole("button", { name: "Filter" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByTestId("filter-tags")).toHaveTextContent("");
    expect(input).toHaveValue("");
  });
});
