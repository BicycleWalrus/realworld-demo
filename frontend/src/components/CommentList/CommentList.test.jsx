import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CommentList from "./CommentList";

// getComments and updateComment are the I/O boundaries this component
// touches for editing - mocked so the edit/save/re-fetch wiring is what's
// exercised, not real network calls.
vi.mock("../../services/getComments");
import getComments from "../../services/getComments";

vi.mock("../../services/updateComment");
import updateComment from "../../services/updateComment";

vi.mock("../../services/postComment");
import postComment from "../../services/postComment";

// useAuth is mocked (same pattern as AuthorInfo.test.jsx) so tests can
// force the author, non-author, and anonymous cases without a real login
// flow.
vi.mock("../../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuth: vi.fn() };
});
import { useAuth } from "../../context/AuthContext";

const author = {
  username: "jane",
  bio: null,
  image: null,
  following: false,
  followersCount: 0,
};

const comment = {
  id: 1,
  body: "original text",
  createdAt: "2020-01-01T00:00:00.000Z",
  author,
};

// Mirrors CommentsSection.jsx's own wiring: `updateComments` sets a new
// `triggerUpdate` value, which is what makes CommentList re-fetch after a
// successful edit (REQ-067).
function Wrapper() {
  const [trigger, setTrigger] = useState({});
  return <CommentList triggerUpdate={trigger} updateComments={setTrigger} />;
}

function renderCommentList() {
  return render(
    <MemoryRouter initialEntries={["/article/dragon-tale"]}>
      <Routes>
        <Route path="/article/:slug" element={<Wrapper />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getComments.mockReset();
  updateComment.mockReset();
  postComment.mockReset();
});

// AC-099: the edit control is shown only to the comment's author.
describe("CommentList edit control visibility", () => {
  test("author sees the edit control", async () => {
    getComments.mockResolvedValue([comment]);
    useAuth.mockReturnValue({
      headers: { Authorization: "Bearer token" },
      isAuth: true,
      loggedUser: { username: "jane" },
    });

    const { container } = renderCommentList();

    await screen.findByText("original text");

    expect(container.querySelector(".ion-edit")).toBeInTheDocument();
  });

  test("a different authenticated user does not see the edit control", async () => {
    getComments.mockResolvedValue([comment]);
    useAuth.mockReturnValue({
      headers: { Authorization: "Bearer token" },
      isAuth: true,
      loggedUser: { username: "someone-else" },
    });

    const { container } = renderCommentList();

    await screen.findByText("original text");

    expect(container.querySelector(".ion-edit")).not.toBeInTheDocument();
  });

  test("an anonymous visitor does not see the edit control", async () => {
    getComments.mockResolvedValue([comment]);
    useAuth.mockReturnValue({
      headers: null,
      isAuth: false,
      loggedUser: { username: "" },
    });

    const { container } = renderCommentList();

    await screen.findByText("original text");

    expect(container.querySelector(".ion-edit")).not.toBeInTheDocument();
  });
});

// AC-111/AC-112: a comment's `@username` tokens link to that user's
// profile only when the username appears in the comment's `mentions`
// (server-resolved, valid usernames) - any other `@word` stays plain text.
describe("CommentList — @mention rendering", () => {
  test("a mentioned, valid username links to their profile; an unmatched one stays plain text", async () => {
    getComments.mockResolvedValue([
      { ...comment, body: "hey @jane and @ghost", mentions: ["jane"] },
    ]);
    useAuth.mockReturnValue({
      headers: null,
      isAuth: false,
      loggedUser: { username: "" },
    });

    const { container } = renderCommentList();

    await waitFor(() => expect(container.querySelector(".card-text")).not.toBeNull());

    const cardText = container.querySelector(".card-text");
    expect(cardText.textContent).toBe("hey @jane and @ghost");

    const mentionLink = cardText.querySelector("a.mention");
    expect(mentionLink).toHaveAttribute("href", "/profile/jane");
    expect(mentionLink).toHaveTextContent("@jane");

    // "@ghost" matches no user, so it must not be wrapped in a link.
    expect(cardText.querySelectorAll("a.mention")).toHaveLength(1);
  });
});

describe("CommentList editing flow (author)", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      headers: { Authorization: "Bearer token" },
      isAuth: true,
      loggedUser: { username: "jane" },
    });
  });

  // AC-098: saving an edit calls updateComment with the new body, and the
  // persisted body (from a subsequent getComments fetch) is what's shown.
  test("editing and saving updates the comment and re-fetches", async () => {
    const updatedComment = { ...comment, body: "edited text" };
    getComments
      .mockResolvedValueOnce([comment])
      .mockResolvedValueOnce([updatedComment]);
    updateComment.mockResolvedValue(updatedComment);

    const { container } = renderCommentList();

    await screen.findByText("original text");

    fireEvent.click(container.querySelector(".ion-edit").closest("button"));

    const textarea = screen.getByRole("textbox");
    expect(textarea).toHaveValue("original text");
    fireEvent.change(textarea, { target: { value: "edited text" } });

    fireEvent.click(screen.getByText("Save"));

    await waitFor(() =>
      expect(updateComment).toHaveBeenCalledWith({
        body: "edited text",
        commentId: 1,
        headers: { Authorization: "Bearer token" },
        slug: "dragon-tale",
      }),
    );

    // The re-fetch (triggered by updateComments) is what surfaces the
    // persisted body, not just the local draft.
    expect(await screen.findByText("edited text")).toBeInTheDocument();
    expect(getComments).toHaveBeenCalledTimes(2);
  });

  // AC-097: an empty/whitespace-only body blocks the save client-side.
  test("saving an empty body does not call updateComment", async () => {
    getComments.mockResolvedValue([comment]);

    const { container } = renderCommentList();

    await screen.findByText("original text");

    fireEvent.click(container.querySelector(".ion-edit").closest("button"));

    const textarea = screen.getByRole("textbox");
    fireEvent.change(textarea, { target: { value: "   " } });

    fireEvent.click(screen.getByText("Save"));

    expect(updateComment).not.toHaveBeenCalled();
    // Still in edit mode - the textarea remains, showing the save was
    // blocked rather than silently succeeding.
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  test("cancel exits edit mode without saving", async () => {
    getComments.mockResolvedValue([comment]);

    const { container } = renderCommentList();

    await screen.findByText("original text");

    fireEvent.click(container.querySelector(".ion-edit").closest("button"));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "unsaved draft" },
    });

    fireEvent.click(screen.getByText("Cancel"));

    expect(updateComment).not.toHaveBeenCalled();
    expect(await screen.findByText("original text")).toBeInTheDocument();
  });
});

// AC-114: a top-level comment's replies are rendered nested underneath it.
describe("CommentList — nested replies", () => {
  test("a top-level comment's replies render nested under it", async () => {
    const replyAuthor = { ...author, username: "bob" };
    const reply = {
      id: 2,
      body: "a reply",
      createdAt: "2020-01-02T00:00:00.000Z",
      author: replyAuthor,
    };
    getComments.mockResolvedValue([{ ...comment, replies: [reply] }]);
    useAuth.mockReturnValue({
      headers: null,
      isAuth: false,
      loggedUser: { username: "" },
    });

    renderCommentList();

    await screen.findByText("original text");

    expect(await screen.findByText("a reply")).toBeInTheDocument();
  });
});

// AC-113: the Reply control is offered only on top-level comments (auth
// rule mirrors posting a top-level comment), never on a reply, and
// submitting it posts the reply with the parent's id.
describe("CommentList — replying to a top-level comment", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      headers: { Authorization: "Bearer token" },
      isAuth: true,
      loggedUser: { username: "someone-else" },
    });
  });

  test("an authenticated user sees Reply on a top-level comment but not on a reply", async () => {
    const replyAuthor = { ...author, username: "bob" };
    const reply = {
      id: 2,
      body: "a reply",
      createdAt: "2020-01-02T00:00:00.000Z",
      author: replyAuthor,
    };
    getComments.mockResolvedValue([{ ...comment, replies: [reply] }]);

    renderCommentList();

    await screen.findByText("original text");
    await screen.findByText("a reply");

    // Only the top-level comment offers a Reply control - one level of
    // nesting only, so a reply itself is not repliable.
    expect(screen.getAllByText("Reply")).toHaveLength(1);
  });

  test("an anonymous visitor does not see the Reply control", async () => {
    getComments.mockResolvedValue([comment]);
    useAuth.mockReturnValue({
      headers: null,
      isAuth: false,
      loggedUser: { username: "" },
    });

    renderCommentList();

    await screen.findByText("original text");

    expect(screen.queryByText("Reply")).not.toBeInTheDocument();
  });

  test("submitting a reply posts it with the parent's id and re-fetches", async () => {
    const newReply = {
      id: 2,
      body: "my reply",
      createdAt: "2020-01-02T00:00:00.000Z",
      author: { ...author, username: "someone-else" },
    };
    getComments
      .mockResolvedValueOnce([comment])
      .mockResolvedValueOnce([{ ...comment, replies: [newReply] }]);
    postComment.mockResolvedValue(newReply);

    renderCommentList();

    await screen.findByText("original text");

    fireEvent.click(screen.getByText("Reply"));

    const textarea = screen.getByPlaceholderText("Write a reply...");
    fireEvent.change(textarea, { target: { value: "my reply" } });

    fireEvent.click(screen.getByText("Post Reply"));

    await waitFor(() =>
      expect(postComment).toHaveBeenCalledWith({
        body: "my reply",
        headers: { Authorization: "Bearer token" },
        parentId: 1,
        slug: "dragon-tale",
      }),
    );

    expect(await screen.findByText("my reply")).toBeInTheDocument();
    expect(getComments).toHaveBeenCalledTimes(2);
  });

  test("submitting an empty reply does not call postComment", async () => {
    getComments.mockResolvedValue([comment]);

    renderCommentList();

    await screen.findByText("original text");

    fireEvent.click(screen.getByText("Reply"));

    const textarea = screen.getByPlaceholderText("Write a reply...");
    fireEvent.change(textarea, { target: { value: "   " } });

    fireEvent.click(screen.getByText("Post Reply"));

    expect(postComment).not.toHaveBeenCalled();
  });

  test("cancel closes the reply form without posting", async () => {
    getComments.mockResolvedValue([comment]);

    renderCommentList();

    await screen.findByText("original text");

    fireEvent.click(screen.getByText("Reply"));
    fireEvent.change(screen.getByPlaceholderText("Write a reply..."), {
      target: { value: "unsent draft" },
    });

    fireEvent.click(screen.getByText("Cancel"));

    expect(postComment).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText("Write a reply...")).not.toBeInTheDocument();
  });
});
