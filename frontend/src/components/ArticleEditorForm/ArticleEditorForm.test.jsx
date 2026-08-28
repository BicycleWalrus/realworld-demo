import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ArticleEditorForm from "./ArticleEditorForm";

// setArticle is the I/O boundary this component touches to persist the
// article - mocked so the "Save as Draft" vs "Publish"/"Update" wiring is
// what's exercised, not a real network call.
vi.mock("../../services/setArticle");
import setArticle from "../../services/setArticle";

// useAuth is mocked (same pattern as CommentList.test.jsx) so tests can
// force an authenticated author without a real login flow.
vi.mock("../../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuth: vi.fn() };
});
import { useAuth } from "../../context/AuthContext";

function renderEditor(initialEntry = "/editor") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/editor" element={<ArticleEditorForm />} />
        <Route path="/editor/:slug" element={<ArticleEditorForm />} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillForm() {
  fireEvent.change(screen.getByPlaceholderText("Article Title"), {
    target: { value: "A New Article" },
  });
  fireEvent.change(screen.getByPlaceholderText("What's this article about?"), {
    target: { value: "a description" },
  });
  fireEvent.change(screen.getByPlaceholderText("Write your article (in markdown)"), {
    target: { value: "the body" },
  });
}

beforeEach(() => {
  setArticle.mockReset().mockResolvedValue("a-new-article");
  useAuth.mockReturnValue({
    headers: { Authorization: "Bearer token" },
    isAuth: true,
    loggedUser: { username: "jane" },
  });
});

// REQ-069/AC-100: the primary control publishes the article, while the
// secondary "Save as Draft" control creates it unpublished - both calling
// the same setArticle service with only the `published` flag differing.
describe("ArticleEditorForm publish vs draft", () => {
  test("the primary button calls setArticle with published:true", async () => {
    renderEditor();

    fillForm();
    fireEvent.click(screen.getByText("Publish Article"));

    await waitFor(() =>
      expect(setArticle).toHaveBeenCalledWith(
        expect.objectContaining({ published: true, title: "A New Article" }),
      ),
    );
  });

  test("the Save as Draft button calls setArticle with published:false", async () => {
    renderEditor();

    fillForm();
    fireEvent.click(screen.getByText("Save as Draft"));

    await waitFor(() =>
      expect(setArticle).toHaveBeenCalledWith(
        expect.objectContaining({ published: false, title: "A New Article" }),
      ),
    );
  });

  test("Save as Draft is a non-submit button, so it does not trigger the form's own submit handler twice", () => {
    renderEditor();

    const draftButton = screen.getByText("Save as Draft");
    expect(draftButton).toHaveAttribute("type", "button");
  });
});
