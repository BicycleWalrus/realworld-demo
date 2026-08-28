import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ArticlesButtons from "./ArticlesButtons";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const article = {
  author: { followersCount: 0, following: false, username: "jane" },
  body: "Some body.",
  favorited: false,
  favoritesCount: 0,
  slug: "hello-world",
  title: "Hello World",
};

function renderWithRouter(loggedUsername) {
  useAuth.mockReturnValue({
    headers: null,
    isAuth: !!loggedUsername,
    loggedUser: { username: loggedUsername || "" },
  });

  render(
    <MemoryRouter initialEntries={["/article/hello-world"]}>
      <Routes>
        <Route
          path="/article/:slug"
          element={<ArticlesButtons article={article} setArticle={() => {}} />}
        />
      </Routes>
    </MemoryRouter>
  );
}

it("should render the download button alongside Follow/Fav buttons for an anonymous viewer", () => {
  renderWithRouter(undefined);

  expect(screen.getByRole("button", { name: /download markdown/i })).toBeInTheDocument();
  expect(screen.getByText(/followers/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /favorite/i })).toBeInTheDocument();
});

it("should render the download button alongside Follow/Fav buttons for an authenticated non-author", () => {
  renderWithRouter("someone-else");

  expect(screen.getByRole("button", { name: /download markdown/i })).toBeInTheDocument();
  expect(screen.getByText(/follow/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /favorite/i })).toBeInTheDocument();
});

it("should render the download button alongside the author's Edit/Delete buttons for the article's author", () => {
  renderWithRouter("jane");

  expect(screen.getByRole("button", { name: /download markdown/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /delete article/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /edit article/i })).toBeInTheDocument();
});
