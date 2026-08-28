import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import * as AuthContext from "../../context/AuthContext";
import setArticle from "../../services/setArticle";
import ArticleEditorForm from "./ArticleEditorForm";

vi.mock("../../services/setArticle");
vi.mock("../../services/getArticle");

function renderEditor() {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({
    isAuth: true,
    headers: {},
    loggedUser: { username: "jane" },
  });

  return render(
    <MemoryRouter initialEntries={["/editor"]}>
      <Routes>
        <Route path="/editor" element={<ArticleEditorForm />} />
        <Route path="/article/:slug" element={<div>article page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  setArticle.mockReset();
  setArticle.mockResolvedValue("new-slug");
});

test("submitting with an image URL includes it in the request", async () => {
  renderEditor();

  await userEvent.type(screen.getByPlaceholderText("Article Title"), "A Title");
  await userEvent.type(screen.getByPlaceholderText("What's this article about?"), "A description");
  await userEvent.type(screen.getByPlaceholderText("Write your article (in markdown)"), "Body text");
  await userEvent.type(
    screen.getByPlaceholderText("Cover image URL (optional)"),
    "https://example.com/cover.png",
  );
  await userEvent.click(screen.getByText("Publish Article"));

  expect(setArticle).toHaveBeenCalledWith(
    expect.objectContaining({ image: "https://example.com/cover.png" }),
  );
});

test("submitting without an image URL still submits successfully", async () => {
  renderEditor();

  await userEvent.type(screen.getByPlaceholderText("Article Title"), "A Title");
  await userEvent.type(screen.getByPlaceholderText("What's this article about?"), "A description");
  await userEvent.type(screen.getByPlaceholderText("Write your article (in markdown)"), "Body text");
  await userEvent.click(screen.getByText("Publish Article"));

  expect(setArticle).toHaveBeenCalledWith(expect.objectContaining({ image: "" }));
});
