import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import postComment from "../../services/postComment";
import searchUsers from "../../services/searchUsers";
import CommentEditor from "./CommentEditor";

vi.mock("../../context/AuthContext");
vi.mock("../../services/postComment");
vi.mock("../../services/searchUsers");

function renderEditor(updateComments = () => {}) {
  return render(
    <MemoryRouter>
      <CommentEditor updateComments={updateComments} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({
    headers: null,
    isAuth: true,
    loggedUser: { username: "jane", image: null },
  });
  searchUsers.mockResolvedValue([]);
});

describe("CommentEditor mention autocomplete", () => {
  it("shows matching username suggestions while typing an @mention", async () => {
    searchUsers.mockResolvedValue(["bob", "bobby"]);
    renderEditor();

    fireEvent.change(screen.getByPlaceholderText("Write a comment..."), {
      target: { value: "hi @bo", selectionStart: 6 },
    });

    expect(await screen.findByRole("button", { name: "@bob" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "@bobby" })).toBeInTheDocument();
  });

  it("shows no suggestions once the @mention is confirmed with a trailing space", async () => {
    renderEditor();

    fireEvent.change(screen.getByPlaceholderText("Write a comment..."), {
      target: { value: "hi @bob ", selectionStart: 8 },
    });

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /^@/ })).not.toBeInTheDocument();
    });
  });

  it("inserts the selected username into the comment body", async () => {
    searchUsers.mockResolvedValue(["bob"]);
    renderEditor();
    const textarea = screen.getByPlaceholderText("Write a comment...");

    fireEvent.change(textarea, { target: { value: "hi @bo", selectionStart: 6 } });
    fireEvent.click(await screen.findByRole("button", { name: "@bob" }));

    expect(textarea).toHaveValue("hi @bob ");
  });
});
