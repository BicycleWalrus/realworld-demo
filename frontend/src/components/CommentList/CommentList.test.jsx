import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import * as AuthContext from "../../context/AuthContext";
import deleteComment from "../../services/deleteComment";
import editComment from "../../services/editComment";
import getComments from "../../services/getComments";
import CommentList from "./CommentList";

vi.mock("../../services/getComments");
vi.mock("../../services/editComment");
vi.mock("../../services/deleteComment");

const author = { username: "jane", image: null };
const comment = { id: 1, body: "original text", createdAt: "2020-01-01T00:00:00.000Z", author };

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
  getComments.mockResolvedValue([{ ...comment }]);
});

// Edit control is only shown to the comment's author.
test("shows the edit control only to the comment's author", async () => {
  renderCommentList({ isAuth: true, loggedUser: { username: "jane" } });

  expect(await screen.findByText("original text")).toBeInTheDocument();
  expect(document.querySelector(".ion-edit")).toBeInTheDocument();
  expect(document.querySelector(".ion-trash-a")).toBeInTheDocument();
});

test("hides the edit control from a non-author", async () => {
  renderCommentList({ isAuth: true, loggedUser: { username: "someone-else" } });

  expect(await screen.findByText("original text")).toBeInTheDocument();
  expect(document.querySelector(".ion-edit")).not.toBeInTheDocument();
  expect(document.querySelector(".ion-trash-a")).not.toBeInTheDocument();
});

test("hides the edit control from an anonymous visitor", async () => {
  renderCommentList({ isAuth: false, loggedUser: null });

  expect(await screen.findByText("original text")).toBeInTheDocument();
  expect(document.querySelector(".ion-edit")).not.toBeInTheDocument();
});

// AC-088 / AC-091: editing calls the edit service, then triggers the same
// refetch mechanism used by create/delete (not an optimistic local update).
test("editing a comment calls editComment and triggers a refetch", async () => {
  editComment.mockResolvedValue({ ...comment, body: "updated text" });
  const { updateComments } = renderCommentList({
    isAuth: true,
    loggedUser: { username: "jane" },
  });

  await screen.findByText("original text");

  await userEvent.click(document.querySelector(".ion-edit").closest("button"));

  const textarea = screen.getByRole("textbox");
  await userEvent.clear(textarea);
  await userEvent.type(textarea, "updated text");
  await userEvent.click(screen.getByText("Save"));

  await waitFor(() => {
    expect(editComment).toHaveBeenCalledWith(
      expect.objectContaining({ body: "updated text", commentId: 1, slug: "a-slug" }),
    );
    expect(updateComments).toHaveBeenCalled();
  });
});
