import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import * as AuthContext from "../../context/AuthContext";
import getReadingList from "../../services/getReadingList";
import ReadingList from "./ReadingList";

vi.mock("../../services/getReadingList");

afterEach(() => {
  vi.restoreAllMocks();
  getReadingList.mockReset();
});

test("anonymous visitor is redirected away instead of seeing the list", async () => {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({ headers: {}, isAuth: false });
  getReadingList.mockResolvedValue({ articles: [], articlesCount: 0 });

  render(
    <MemoryRouter initialEntries={["/reading-list"]}>
      <Routes>
        <Route path="/" element={<div>Home</div>} />
        <Route path="/reading-list" element={<ReadingList />} />
      </Routes>
    </MemoryRouter>,
  );

  await waitFor(() => expect(screen.getByText("Home")).toBeInTheDocument());
});

test("authenticated user sees their saved articles", async () => {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({
    headers: {},
    isAuth: true,
    loggedUser: { username: "jane" },
  });
  getReadingList.mockResolvedValue({
    articles: [{ author: { username: "jane" }, slug: "a-slug", tagList: [], title: "A Slug" }],
    articlesCount: 1,
  });

  render(
    <MemoryRouter initialEntries={["/reading-list"]}>
      <ReadingList />
    </MemoryRouter>,
  );

  await waitFor(() => expect(screen.getByText("A Slug")).toBeInTheDocument());
});

test("empty reading list shows an empty-state message", async () => {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({
    headers: {},
    isAuth: true,
    loggedUser: { username: "jane" },
  });
  getReadingList.mockResolvedValue({ articles: [], articlesCount: 0 });

  render(
    <MemoryRouter initialEntries={["/reading-list"]}>
      <ReadingList />
    </MemoryRouter>,
  );

  await waitFor(() =>
    expect(screen.getByText("Your reading list is empty.")).toBeInTheDocument(),
  );
});
