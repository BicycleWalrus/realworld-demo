import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import getArticles from "../services/getArticles";
import ReadLater from "./ReadLater";

vi.mock("../context/AuthContext");
vi.mock("../services/getArticles");

function renderReadLater() {
  return render(
    <MemoryRouter initialEntries={["/read-later"]}>
      <Routes>
        <Route path="/read-later" element={<ReadLater />} />
        <Route path="/login" element={<div>Login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ReadLater page", () => {
  beforeEach(() => {
    getArticles.mockReset();
  });

  // AC-085: a visitor without an active session is redirected away,
  // consistent with the account settings page (REQ-036).
  test("unauthenticated visitor is redirected to login", async () => {
    useAuth.mockReturnValue({ headers: null, isAuth: false });
    getArticles.mockResolvedValue({ articles: [], articlesCount: 0 });

    renderReadLater();

    expect(await screen.findByText("Login page")).toBeInTheDocument();
  });

  // AC-081: an authenticated user's saved articles are listed.
  test("authenticated user sees their saved articles", async () => {
    useAuth.mockReturnValue({ headers: { Authorization: "Token t" }, isAuth: true });
    getArticles.mockResolvedValue({
      articles: [{ slug: "a", title: "Saved Article", description: "d", author: {} }],
      articlesCount: 1,
    });

    renderReadLater();

    expect(await screen.findByText("Saved Article")).toBeInTheDocument();
    expect(getArticles).toHaveBeenCalledWith(
      expect.objectContaining({ location: "readLater" }),
    );
  });

  // AC-080: an empty list has a sensible, non-crashing empty state.
  test("empty list shows a friendly message, not an error", async () => {
    useAuth.mockReturnValue({ headers: { Authorization: "Token t" }, isAuth: true });
    getArticles.mockResolvedValue({ articles: [], articlesCount: 0 });

    renderReadLater();

    expect(
      await screen.findByText("You haven't saved any articles yet."),
    ).toBeInTheDocument();
  });
});
