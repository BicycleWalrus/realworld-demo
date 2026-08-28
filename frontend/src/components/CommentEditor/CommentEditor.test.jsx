import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import CommentEditor from "./CommentEditor";

// getProfiles is the I/O boundary the @mention autocomplete touches -
// mocked so the suggestion wiring is what's exercised, not a real network
// call (same pattern as Directory.test.jsx and CommentList.test.jsx).
vi.mock("../../services/getProfiles");
import getProfiles from "../../services/getProfiles";

vi.mock("../../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuth: vi.fn() };
});
import { useAuth } from "../../context/AuthContext";

function renderCommentEditor(updateComments = vi.fn()) {
  return render(
    <MemoryRouter initialEntries={["/article/dragon-tale"]}>
      <Routes>
        <Route
          element={<CommentEditor updateComments={updateComments} />}
          path="/article/:slug"
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getProfiles.mockReset();
  useAuth.mockReturnValue({
    headers: { Authorization: "Bearer token" },
    isAuth: true,
    loggedUser: { username: "jane", image: null },
  });
});

// AC-110: typing a trailing "@prefix" fetches matching usernames (via the
// profiles-directory endpoint's optional prefix filter) and offers them as
// suggestions; MVP scope is the mention token at the end of the textarea.
describe("CommentEditor — @mention autocomplete", () => {
  test("typing a trailing @-prefix requests and renders matching suggestions", async () => {
    getProfiles.mockResolvedValue({ profiles: [{ username: "jane" }], profilesCount: 1 });

    renderCommentEditor();

    const textarea = screen.getByPlaceholderText("Write a comment...");
    fireEvent.change(textarea, { target: { value: "hi @ja" } });

    await waitFor(() =>
      expect(getProfiles).toHaveBeenCalledWith({ limit: 5, username: "ja" }),
    );

    expect(await screen.findByText("@jane")).toBeInTheDocument();
  });

  test("clicking a suggestion completes the mention in the textarea", async () => {
    getProfiles.mockResolvedValue({ profiles: [{ username: "jane" }], profilesCount: 1 });

    renderCommentEditor();

    const textarea = screen.getByPlaceholderText("Write a comment...");
    fireEvent.change(textarea, { target: { value: "hi @ja" } });

    const suggestion = await screen.findByText("@jane");
    fireEvent.click(suggestion);

    expect(textarea).toHaveValue("hi @jane ");
    // Selecting a suggestion clears the list.
    expect(screen.queryByText("@jane")).not.toBeInTheDocument();
  });

  test("a body not ending in a mention token shows no suggestions", async () => {
    renderCommentEditor();

    const textarea = screen.getByPlaceholderText("Write a comment...");
    fireEvent.change(textarea, { target: { value: "hi @jane, how are you" } });

    expect(getProfiles).not.toHaveBeenCalled();
    expect(document.querySelector(".mention-suggestions")).toBeNull();
  });
});
