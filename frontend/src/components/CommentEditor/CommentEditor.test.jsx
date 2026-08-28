import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import CommentEditor from "./CommentEditor";

vi.mock("../../services/searchUsers");
vi.mock("../../context/AuthContext");
import searchUsers from "../../services/searchUsers";
import { useAuth } from "../../context/AuthContext";

beforeEach(() => {
  searchUsers.mockReset();
  useAuth.mockReturnValue({
    headers: { Authorization: "Bearer token" },
    isAuth: true,
    loggedUser: { image: null, username: "jane" },
  });
});

// AC-080: typing `@` followed by characters offers matching username
// suggestions to select from.
test("typing @ followed by characters shows matching username suggestions", async () => {
  searchUsers.mockResolvedValue([{ username: "alice" }, { username: "alison" }]);
  const user = userEvent.setup();

  render(<CommentEditor updateComments={vi.fn()} />, { wrapper: MemoryRouter });

  await user.type(screen.getByPlaceholderText("Write a comment..."), "hi @ali");

  await waitFor(() => expect(searchUsers).toHaveBeenCalledWith({ q: "ali" }));
  expect(await screen.findByText("@alice")).toBeInTheDocument();
  expect(screen.getByText("@alison")).toBeInTheDocument();
});

// AC-080 continuation: selecting a suggestion inserts the full @username
// into the comment body in place of the in-progress mention.
test("selecting a suggestion inserts the full @username into the comment", async () => {
  searchUsers.mockResolvedValue([{ username: "alice" }]);
  const user = userEvent.setup();

  render(<CommentEditor updateComments={vi.fn()} />, { wrapper: MemoryRouter });

  const textarea = screen.getByPlaceholderText("Write a comment...");
  await user.type(textarea, "hi @ali");
  await user.click(await screen.findByText("@alice"));

  expect(textarea).toHaveValue("hi @alice ");
});

// No suggestions are shown outside of an active @mention.
test("no @ present -> no suggestion lookup", async () => {
  const user = userEvent.setup();

  render(<CommentEditor updateComments={vi.fn()} />, { wrapper: MemoryRouter });

  await user.type(screen.getByPlaceholderText("Write a comment..."), "just a comment");

  expect(searchUsers).not.toHaveBeenCalled();
});

test("unauthenticated visitor sees sign-in prompt instead of the editor", () => {
  useAuth.mockReturnValue({ headers: null, isAuth: false, loggedUser: null });

  render(<CommentEditor updateComments={vi.fn()} />, { wrapper: MemoryRouter });

  expect(screen.queryByPlaceholderText("Write a comment...")).not.toBeInTheDocument();
  expect(screen.getByText("Sign in")).toBeInTheDocument();
});
