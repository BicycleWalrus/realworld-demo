import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import getComments from "../../services/getComments";
import updateComment from "../../services/updateComment";
import CommentList from "./CommentList";

vi.mock("../../context/AuthContext");
vi.mock("../../services/getComments");
vi.mock("../../services/updateComment");
vi.mock("../../services/deleteComment");

function makeComment(overrides = {}) {
  return {
    id: 1,
    body: "original comment",
    createdAt: "2020-01-01T00:00:00.000Z",
    author: { username: "jane", bio: null, image: null, following: false },
    ...overrides,
  };
}

function mockAuth({ isAuth, username } = {}) {
  useAuth.mockReturnValue({
    headers: null,
    isAuth: !!isAuth,
    loggedUser: { username },
  });
}

function renderList({ updateComments = () => {} } = {}) {
  return render(
    <MemoryRouter initialEntries={["/article/a-slug"]}>
      <Routes>
        <Route
          path="/article/:slug"
          element={
            <CommentList triggerUpdate={{}} updateComments={updateComments} />
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  getComments.mockResolvedValue([makeComment()]);
});

describe("CommentList", () => {
  it("does not show an edit control to a non-author viewer", async () => {
    mockAuth({ isAuth: true, username: "someone-else" });
    renderList();

    await screen.findByText("original comment");

    expect(
      screen.queryByRole("button", { name: "Edit comment" }),
    ).not.toBeInTheDocument();
  });

  it("does not show an edit control to an unauthenticated visitor", async () => {
    mockAuth({ isAuth: false });
    renderList();

    await screen.findByText("original comment");

    expect(
      screen.queryByRole("button", { name: "Edit comment" }),
    ).not.toBeInTheDocument();
  });

  it("shows an edit control only to the comment's author", async () => {
    mockAuth({ isAuth: true, username: "jane" });
    renderList();

    await screen.findByText("original comment");

    expect(
      screen.getByRole("button", { name: "Edit comment" }),
    ).toBeInTheDocument();
  });

  // AC: after a successful edit, what's displayed comes from the server's
  // response (via updateComments, which drives a refetch), not just the
  // locally-typed value held optimistically in this component's own state.
  it("saves via the server and hands the server's response to updateComments, closing the editor", async () => {
    mockAuth({ isAuth: true, username: "jane" });
    const savedComment = makeComment({ body: "edited comment" });
    updateComment.mockResolvedValue(savedComment);
    const updateComments = vi.fn();
    renderList({ updateComments });
    await screen.findByText("original comment");

    fireEvent.click(screen.getByRole("button", { name: "Edit comment" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "edited comment" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateComments).toHaveBeenCalledWith(savedComment);
    });
    expect(updateComment).toHaveBeenCalledWith(
      expect.objectContaining({ body: "edited comment", commentId: 1 }),
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("cancels editing without saving", async () => {
    mockAuth({ isAuth: true, username: "jane" });
    renderList();
    await screen.findByText("original comment");

    fireEvent.click(screen.getByRole("button", { name: "Edit comment" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "a change I want to discard" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(updateComment).not.toHaveBeenCalled();
    expect(screen.getByText("original comment")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
