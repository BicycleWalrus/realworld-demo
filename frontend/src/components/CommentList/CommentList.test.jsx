import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import getComments from "../../services/getComments";
import postComment from "../../services/postComment";
import searchUsers from "../../services/searchUsers";
import updateComment from "../../services/updateComment";
import verifyUsernames from "../../services/verifyUsernames";
import CommentList from "./CommentList";

vi.mock("../../context/AuthContext");
vi.mock("../../services/getComments");
vi.mock("../../services/postComment");
vi.mock("../../services/updateComment");
vi.mock("../../services/deleteComment");
vi.mock("../../services/searchUsers");
vi.mock("../../services/verifyUsernames");

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
  searchUsers.mockResolvedValue([]);
  verifyUsernames.mockResolvedValue([]);
});

// AC-097
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

  // Mentions are resolved at render time against whichever comments are
  // currently loaded, so this applies retroactively to pre-existing
  // comments too - there's no separate "mentions" field stored on a
  // comment from creation time.
  // AC-112, AC-114
  it("linkifies an @mention that matches a real user, in a pre-existing comment", async () => {
    mockAuth({ isAuth: true, username: "jane" });
    getComments.mockResolvedValue([makeComment({ body: "hi @bob!" })]);
    verifyUsernames.mockResolvedValue(["bob"]);
    renderList();

    const link = await screen.findByRole("link", { name: "@bob" });
    expect(link).toHaveAttribute("href", "/profile/bob");
  });

  it("leaves an @mention with no matching user as plain text", async () => {
    mockAuth({ isAuth: true, username: "jane" });
    getComments.mockResolvedValue([makeComment({ body: "hi @ghost!" })]);
    verifyUsernames.mockResolvedValue([]);
    renderList();

    await screen.findByText("hi", { exact: false });

    expect(screen.queryByRole("link", { name: "@ghost" })).not.toBeInTheDocument();
  });
});

// Threaded replies (REQ-064).
describe("CommentList threaded replies", () => {
  // AC-145: the Reply control follows the same auth rules as posting a
  // top-level comment — available signed in, absent signed out.
  it("shows a reply control to an authenticated visitor", async () => {
    mockAuth({ isAuth: true, username: "someone-else" });
    renderList();

    await screen.findByText("original comment");

    expect(
      screen.getByRole("button", { name: "Reply to comment" }),
    ).toBeInTheDocument();
  });

  it("does not show a reply control to an unauthenticated visitor", async () => {
    mockAuth({ isAuth: false });
    renderList();

    await screen.findByText("original comment");

    expect(
      screen.queryByRole("button", { name: "Reply to comment" }),
    ).not.toBeInTheDocument();
  });

  // AC-146: submitting the reply form posts with the parent's id and
  // hands the server's response to updateComments (which refetches).
  it("posts a reply with the parent comment id and closes the form", async () => {
    mockAuth({ isAuth: true, username: "jane" });
    const posted = makeComment({ id: 2, body: "a reply" });
    postComment.mockResolvedValue(posted);
    const updateComments = vi.fn();
    renderList({ updateComments });
    await screen.findByText("original comment");

    fireEvent.click(screen.getByRole("button", { name: "Reply to comment" }));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "a reply" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post Reply" }));

    await waitFor(() => {
      expect(updateComments).toHaveBeenCalledWith(posted);
    });
    expect(postComment).toHaveBeenCalledWith(
      expect.objectContaining({ body: "a reply", parentCommentId: 1 }),
    );
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  // AC-146/AC-147: server-nested replies render under their parent, and
  // only top-level comments carry Reply controls (one nesting level).
  it("renders server-nested replies under their parent", async () => {
    mockAuth({ isAuth: true, username: "jane" });
    getComments.mockResolvedValue([
      makeComment({
        id: 1,
        replies: [
          makeComment({
            id: 2,
            body: "a nested reply",
            author: { username: "bob", bio: null, image: null, following: false },
          }),
        ],
      }),
    ]);
    renderList();

    await screen.findByText("a nested reply");

    expect(
      screen.getAllByRole("button", { name: "Reply to comment" }),
    ).toHaveLength(1);
  });
});
