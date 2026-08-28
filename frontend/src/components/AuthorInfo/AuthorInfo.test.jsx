import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthProvider from "../../context/AuthContext";
import getProfile from "../../services/getProfile";
import AuthorInfo from "./AuthorInfo";

vi.mock("../../services/getProfile");

function renderProfile(authorState) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: "/profile/jane", state: authorState }]}
    >
      <AuthProvider>
        <Routes>
          <Route path="/profile/:username" element={<AuthorInfo />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function makeAuthorState(overrides = {}) {
  return {
    // Left empty so the markdown bio isn't rendered - these tests only
    // exercise the social links, not the markdown-to-jsx rendering path.
    bio: "",
    followersCount: 0,
    following: false,
    image: null,
    // articleCount must be present for the nav-state freshness shortcut to
    // skip a refetch (nav-state never carries these stats fields on real
    // navigations, so their absence always forces one fetch) - included
    // here so these fixtures don't trigger a real network call in tests
    // that aren't exercising the stats themselves.
    articleCount: 0,
    totalFavoritesCount: 0,
    memberSince: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// AC-104
it("renders no social links section when none are set", () => {
  renderProfile(makeAuthorState());

  expect(screen.queryByRole("link", { name: /website/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /github/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /twitter/i })).not.toBeInTheDocument();
});

// AC-103
it("renders only the social links that are set", () => {
  renderProfile(makeAuthorState({ website: "https://jane.dev" }));

  expect(screen.getByRole("link", { name: /website/i })).toHaveAttribute(
    "href",
    "https://jane.dev",
  );
  expect(screen.queryByRole("link", { name: /github/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /twitter/i })).not.toBeInTheDocument();
});

// AC-103
it("renders all three social links when all are set", () => {
  renderProfile(
    makeAuthorState({
      website: "https://jane.dev",
      github: "https://github.com/jane",
      twitter: "https://twitter.com/jane",
    }),
  );

  expect(screen.getByRole("link", { name: /website/i })).toHaveAttribute(
    "href",
    "https://jane.dev",
  );
  expect(screen.getByRole("link", { name: /github/i })).toHaveAttribute(
    "href",
    "https://github.com/jane",
  );
  expect(screen.getByRole("link", { name: /twitter/i })).toHaveAttribute(
    "href",
    "https://twitter.com/jane",
  );
});

// AC-107, AC-108
it("renders the author's article count, total favorites, and member-since date", () => {
  renderProfile(
    makeAuthorState({
      articleCount: 4,
      totalFavoritesCount: 9,
      memberSince: "2019-06-15T12:00:00.000Z",
    }),
  );

  expect(screen.getByText(/4 Articles/)).toBeInTheDocument();
  expect(screen.getByText(/9 Favorites/)).toBeInTheDocument();
  expect(screen.getByText(/Member since June 15, 2019/)).toBeInTheDocument();
});

// AC-107
it("renders a zero-state for an author with no articles or favorites yet", () => {
  renderProfile(
    makeAuthorState({ articleCount: 0, totalFavoritesCount: 0 }),
  );

  expect(screen.getByText(/0 Articles/)).toBeInTheDocument();
  expect(screen.getByText(/0 Favorites/)).toBeInTheDocument();
});

// AC-110
it("backfills stats with one fetch when nav-state doesn't include them, without a second one", async () => {
  const stateWithoutStats = makeAuthorState();
  delete stateWithoutStats.articleCount;
  delete stateWithoutStats.totalFavoritesCount;
  delete stateWithoutStats.memberSince;

  getProfile.mockResolvedValue({
    ...stateWithoutStats,
    articleCount: 3,
    totalFavoritesCount: 7,
    memberSince: "2021-03-01T00:00:00.000Z",
  });

  renderProfile(stateWithoutStats);

  expect(await screen.findByText(/3 Articles/)).toBeInTheDocument();
  expect(screen.getByText(/7 Favorites/)).toBeInTheDocument();
  expect(getProfile).toHaveBeenCalledTimes(1);
});
