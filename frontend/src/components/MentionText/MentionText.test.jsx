import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MentionText from "./MentionText";

function renderText(body, knownUsernames) {
  return render(
    <MemoryRouter>
      <MentionText body={body} knownUsernames={knownUsernames} />
    </MemoryRouter>,
  );
}

describe("MentionText", () => {
  it("renders a known mention as a link to the user's profile", () => {
    renderText("hi @jane", ["jane"]);

    const link = screen.getByRole("link", { name: "@jane" });
    expect(link).toHaveAttribute("href", "/profile/jane");
  });

  it("renders an unknown mention as plain text, not a link", () => {
    renderText("hi @ghost", ["jane"]);

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("@ghost", { exact: false })).toBeInTheDocument();
  });

  it("renders plain text unchanged when there are no mentions", () => {
    renderText("just a comment", []);

    expect(screen.getByText("just a comment")).toBeInTheDocument();
  });
});
