import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CommentBody from "./CommentBody";

vi.mock("../../services/searchUsers");
import searchUsers from "../../services/searchUsers";

beforeEach(() => {
  searchUsers.mockReset();
});

// AC-081/AC-083: a comment containing @username that matches an existing
// user is rendered as a link to that user's profile page.
test("mention matching an existing username -> rendered as a profile link", async () => {
  searchUsers.mockResolvedValue([{ username: "alice" }]);

  render(<CommentBody body="hi @alice, nice work" />, { wrapper: MemoryRouter });

  const link = await screen.findByRole("link", { name: "@alice" });
  expect(link).toHaveAttribute("href", "/profile/alice");
});

// AC-082: an @something that does not match any existing username is
// displayed as plain text, not a broken link.
test("mention with no matching username -> plain text, not a link", async () => {
  searchUsers.mockResolvedValue([]);

  render(<CommentBody body="hi @nobody around?" />, { wrapper: MemoryRouter });

  await waitFor(() => expect(searchUsers).toHaveBeenCalledWith({ q: "nobody" }));
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(screen.getByText(/@nobody/)).toBeInTheDocument();
});

// AC-084: retroactive rendering — CommentBody applies to any comment body it
// is given, regardless of when the underlying comment was created.
test("comment body with no mentions -> renders unchanged, no lookup performed", () => {
  render(<CommentBody body="just a plain comment" />, { wrapper: MemoryRouter });

  expect(screen.getByText("just a plain comment")).toBeInTheDocument();
  expect(searchUsers).not.toHaveBeenCalled();
});
