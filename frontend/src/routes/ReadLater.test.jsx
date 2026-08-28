import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import getReadLaterList from "../services/getReadLaterList";
import ReadLater from "./ReadLater";

vi.mock("../context/AuthContext");
vi.mock("../services/getReadLaterList");

function renderReadLater() {
  return render(
    <MemoryRouter initialEntries={["/read-later"]}>
      <Routes>
        <Route path="/read-later" element={<ReadLater />} />
        <Route path="/" element={<div>Home page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReadLater", () => {
  it("redirects to the home page when not authenticated", async () => {
    useAuth.mockReturnValue({ headers: null, isAuth: false });

    renderReadLater();

    expect(await screen.findByText("Home page")).toBeInTheDocument();
    expect(getReadLaterList).not.toHaveBeenCalled();
  });

  // AC-131
  it("renders the current user's saved articles", async () => {
    useAuth.mockReturnValue({ headers: {}, isAuth: true });
    getReadLaterList.mockResolvedValue({
      articles: [
        {
          slug: "saved-article",
          title: "Saved Article",
          description: "A saved article.",
          author: { username: "author" },
          tagList: [],
        },
      ],
      articlesCount: 1,
    });

    renderReadLater();

    expect(await screen.findByText("Saved Article")).toBeInTheDocument();
  });
});
