import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import setArticle from "../../services/setArticle";
import ArticleEditorForm from "./ArticleEditorForm";

vi.mock("../../services/setArticle");
vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ headers: {}, isAuth: true, loggedUser: { username: "jane" } }),
}));

function renderForm() {
  return render(
    <MemoryRouter>
      <ArticleEditorForm />
    </MemoryRouter>,
  );
}

function fillRequiredFields() {
  fireEvent.change(screen.getByPlaceholderText("Article Title"), { target: { value: "T" } });
  fireEvent.change(screen.getByPlaceholderText("What's this article about?"), {
    target: { value: "d" },
  });
  fireEvent.change(screen.getByPlaceholderText("Write your article (in markdown)"), {
    target: { value: "b" },
  });
}

describe("ArticleEditorForm", () => {
  beforeEach(() => {
    setArticle.mockReset();
    setArticle.mockResolvedValue("a-slug");
  });

  // AC-080: a user-entered image URL is included in the submitted article.
  test("submits the entered image URL", async () => {
    renderForm();
    fillRequiredFields();
    fireEvent.change(screen.getByPlaceholderText("URL of cover image"), {
      target: { value: "http://x/img.png" },
    });

    fireEvent.click(screen.getByText("Publish Article"));

    await waitFor(() => expect(setArticle).toHaveBeenCalled());
    expect(setArticle.mock.calls[0][0]).toMatchObject({ image: "http://x/img.png" });
  });

  // AC-081: no image entered -> submitted without one.
  test("submits without an image when none is entered", async () => {
    renderForm();
    fillRequiredFields();

    fireEvent.click(screen.getByText("Publish Article"));

    await waitFor(() => expect(setArticle).toHaveBeenCalled());
    expect(setArticle.mock.calls[0][0].image).toBe("");
  });
});
