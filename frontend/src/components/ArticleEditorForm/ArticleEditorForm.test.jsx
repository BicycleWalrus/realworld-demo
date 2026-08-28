import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import getArticle from "../../services/getArticle";
import setArticle from "../../services/setArticle";
import ArticleEditorForm from "./ArticleEditorForm";

vi.mock("../../context/AuthContext");
vi.mock("../../services/getArticle");
vi.mock("../../services/setArticle");

function renderEditor({ initialEntries = ["/editor"] } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route element={<ArticleEditorForm />} path="/editor" />
        <Route element={<ArticleEditorForm />} path="/editor/:slug" />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({
    headers: { Authorization: "Bearer t" },
    isAuth: true,
    loggedUser: { username: "jane" },
  });
  setArticle.mockResolvedValue("a-slug");
});

// REQ-067 draft/publish workflow
describe("ArticleEditorForm", () => {
  it("offers Publish Article and Save Draft when creating", () => {
    renderEditor();

    expect(screen.getByRole("button", { name: "Publish Article" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Draft" })).toBeInTheDocument();
  });

  // AC-159: saving as a draft submits draft=true through the service.
  it("Save Draft submits with draft true", async () => {
    renderEditor();

    fireEvent.change(screen.getByPlaceholderText("Article Title"), {
      target: { value: "A Title" },
    });
    fireEvent.change(screen.getByPlaceholderText("What's this article about?"), {
      target: { value: "A description" },
    });
    fireEvent.change(screen.getByPlaceholderText("Write your article (in markdown)"), {
      target: { value: "A body" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => {
      expect(setArticle).toHaveBeenCalledWith(
        expect.objectContaining({ title: "A Title", draft: true }),
      );
    });
  });

  it("publishing submits with draft false", async () => {
    renderEditor();

    fireEvent.change(screen.getByPlaceholderText("Article Title"), {
      target: { value: "A Title" },
    });
    fireEvent.change(screen.getByPlaceholderText("What's this article about?"), {
      target: { value: "A description" },
    });
    fireEvent.change(screen.getByPlaceholderText("Write your article (in markdown)"), {
      target: { value: "A body" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Publish Article" }));

    await waitFor(() => {
      expect(setArticle).toHaveBeenCalledWith(
        expect.objectContaining({ title: "A Title", draft: false }),
      );
    });
  });

  // AC-163: an existing draft offers publishing as the primary action.
  it("editing a draft offers Publish Article rather than Update Article", async () => {
    getArticle.mockResolvedValue({
      title: "Draft Title",
      description: "d",
      body: "b",
      image: "",
      tagList: [],
      author: { username: "jane" },
      draft: true,
    });
    renderEditor({ initialEntries: ["/editor/draft-slug"] });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Publish Article" })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "Update Article" })).not.toBeInTheDocument();
  });
});
