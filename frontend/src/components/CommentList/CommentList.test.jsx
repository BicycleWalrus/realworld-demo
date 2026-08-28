import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import * as AuthContext from "../../context/AuthContext";
import getComments from "../../services/getComments";
import postComment from "../../services/postComment";
import CommentList from "./CommentList";

vi.mock("../../services/getComments");
vi.mock("../../services/postComment");
vi.mock("../../services/deleteComment");

const author = { username: "jane", image: null };
const parentComment = {
  id: 1,
  body: "top-level comment",
  createdAt: "2020-01-01T00:00:00.000Z",
  author,
  replies: [],
};

function renderCommentList({ isAuth = true, loggedUser = author } = {}) {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({
    headers: {},
    isAuth,
    loggedUser,
  });

  const updateComments = vi.fn();

  render(
    <MemoryRouter initialEntries={["/article/a-slug"]}>
      <Routes>
        <Route
          path="/article/:slug"
          element={<CommentList triggerUpdate={{}} updateComments={updateComments} />}
        />
      </Routes>
    </MemoryRouter>,
  );

  return { updateComments };
}

beforeEach(() => {
  getComments.mockResolvedValue([{ ...parentComment }]);
});

// Reply control is only shown to authenticated users.
test("shows the reply control only when authenticated", async () => {
  renderCommentList({ isAuth: true });

  expect(await screen.findByText("top-level comment")).toBeInTheDocument();
  expect(screen.getByText("Reply")).toBeInTheDocument();
});

test("hides the reply control for an anonymous visitor", async () => {
  renderCommentList({ isAuth: false, loggedUser: null });

  expect(await screen.findByText("top-level comment")).toBeInTheDocument();
  expect(screen.queryByText("Reply")).not.toBeInTheDocument();
});

// Submitting a reply calls postComment with the parent comment's id.
test("submitting a reply posts with the parent's id and triggers a refetch", async () => {
  postComment.mockResolvedValue({ id: 2, body: "a reply" });
  const { updateComments } = renderCommentList({ isAuth: true });

  await screen.findByText("top-level comment");
  await userEvent.click(screen.getByText("Reply"));

  const textarea = screen.getByPlaceholderText("Write a reply...");
  await userEvent.type(textarea, "a reply");
  await userEvent.click(screen.getByText("Post Reply"));

  await waitFor(() => {
    expect(postComment).toHaveBeenCalledWith(
      expect.objectContaining({ body: "a reply", parentId: 1, slug: "a-slug" }),
    );
    expect(updateComments).toHaveBeenCalled();
  });
});

// Replies render nested under their parent comment.
test("renders replies nested under their parent", async () => {
  const reply = {
    id: 3,
    body: "a nested reply",
    createdAt: "2020-01-02T00:00:00.000Z",
    author: { username: "bob", image: null },
  };
  getComments.mockResolvedValue([{ ...parentComment, replies: [reply] }]);

  renderCommentList({ isAuth: true });

  expect(await screen.findByText("top-level comment")).toBeInTheDocument();
  expect(screen.getByText("a nested reply")).toBeInTheDocument();
});
