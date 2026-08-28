import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthProvider from "../../context/AuthContext";
import getProfile from "../../services/getProfile";
import AuthorInfo from "./AuthorInfo";

vi.mock("../../services/getProfile");

function renderAuthorInfo(initialEntries) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <Routes>
          <Route path="/profile/:username" element={<AuthorInfo />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AuthorInfo profile stats", () => {
  beforeEach(() => {
    getProfile.mockReset();
  });

  // AC-080/AC-081/AC-082: article count, total favorites, and a
  // consistently-formatted member-since date are shown, for a direct visit
  // with no navigation state.
  test("renders article count, favorites total, and member-since from a direct visit", async () => {
    getProfile.mockResolvedValue({
      username: "author",
      bio: "",
      followersCount: 0,
      following: false,
      image: null,
      articlesCount: 3,
      favoritesCount: 10,
      memberSince: "2020-01-01T12:11:08.212Z",
    });

    renderAuthorInfo(["/profile/author"]);

    expect(await screen.findByText("3 Articles")).toBeInTheDocument();
    expect(screen.getByText("10 Favorites")).toBeInTheDocument();
    expect(screen.getByText("Member since January 1, 2020")).toBeInTheDocument();
  });

  // AC-083: stats still populate on load even when arriving via an in-app
  // link whose navigation state already matches the displayed bio — the
  // path where REQ-043 skips re-fetching bio/avatar/follow status.
  test("still populates stats when navigation state's bio already matches (REQ-043 skip path)", async () => {
    getProfile.mockResolvedValue({
      articlesCount: 5,
      favoritesCount: 20,
      memberSince: "2020-01-01T12:11:08.212Z",
    });

    renderAuthorInfo([
      {
        pathname: "/profile/author",
        state: { bio: "", followersCount: 0, following: false, image: null },
      },
    ]);

    expect(await screen.findByText("5 Articles")).toBeInTheDocument();
    expect(screen.getByText("20 Favorites")).toBeInTheDocument();
    // Only the stats-only effect should have called the service — the
    // primary bio/avatar/follow effect skipped its own fetch (REQ-043).
    expect(getProfile).toHaveBeenCalledTimes(1);
  });
});
