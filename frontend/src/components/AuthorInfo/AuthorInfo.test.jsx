import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthorInfo from "./AuthorInfo";
import dateFormatter from "../../helpers/dateFormatter";

// getProfile is the only I/O boundary AuthorInfo touches for this data —
// mocked so the component's own render/fetch logic is what's exercised.
vi.mock("../../services/getProfile");
import getProfile from "../../services/getProfile";

// useAuth is mocked (same pattern as ThemeContext.test.jsx) so tests can
// force both the anonymous and authenticated cases without a real login
// flow.
vi.mock("../../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuth: vi.fn() };
});
import { useAuth } from "../../context/AuthContext";

// `bio` is intentionally left falsy: rendering it exercises the unrelated
// markdown-to-jsx pipeline, which these stats-focused tests don't need to
// cover.
const profile = {
  articleCount: 4,
  bio: null,
  favoritesCount: 9,
  followersCount: 2,
  following: false,
  image: null,
  memberSince: "2022-03-14T00:00:00.000Z",
};

// AC-135: a profile with no social links set (matches the base fixture
// above - website/github/twitter absent).
const profileWithoutLinks = profile;

// AC-135: a profile with all three social links set.
const profileWithLinks = {
  ...profile,
  website: "https://jane.dev",
  github: "https://github.com/jane",
  twitter: "https://twitter.com/jane",
};

function renderAuthorInfo(username = "jane") {
  return render(
    <MemoryRouter initialEntries={[`/profile/${username}`]}>
      <Routes>
        <Route path="/profile/:username" element={<AuthorInfo />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getProfile.mockReset().mockResolvedValue(profile);
});

// AC-084, AC-085, AC-086, AC-087: an anonymous visitor sees the author's
// article count, summed favorites, and formatted member-since date.
describe("AuthorInfo author stats — anonymous visitor", () => {
  test("renders articleCount, favoritesCount, and formatted memberSince", async () => {
    useAuth.mockReturnValue({
      headers: null,
      loggedUser: { username: "" },
    });

    renderAuthorInfo("jane");

    await waitFor(() => expect(getProfile).toHaveBeenCalled());

    expect(await screen.findByText("4 articles")).toBeInTheDocument();
    expect(screen.getByText("9 favorites")).toBeInTheDocument();
    expect(
      screen.getByText(`Member since ${dateFormatter(profile.memberSince)}`),
    ).toBeInTheDocument();
  });
});

// AC-084, AC-085, AC-086, AC-087: the same stats render for an
// authenticated visitor viewing someone else's profile.
describe("AuthorInfo author stats — authenticated visitor", () => {
  test("renders articleCount, favoritesCount, and formatted memberSince", async () => {
    useAuth.mockReturnValue({
      headers: { Authorization: "Bearer token" },
      loggedUser: { username: "reader" },
    });

    renderAuthorInfo("jane");

    await waitFor(() => expect(getProfile).toHaveBeenCalled());

    expect(await screen.findByText("4 articles")).toBeInTheDocument();
    expect(screen.getByText("9 favorites")).toBeInTheDocument();
    expect(
      screen.getByText(`Member since ${dateFormatter(profile.memberSince)}`),
    ).toBeInTheDocument();
  });
});

// REQ-056: router state without stats (e.g. ArticleMeta's Link, which only
// passes bio/followersCount/following/image) must not stop the fetch that
// populates them — otherwise a visitor arriving via that link would never
// see stats.
describe("AuthorInfo author stats — fetch-when-missing", () => {
  test("fetches and renders stats even when router state already matches on bio", async () => {
    useAuth.mockReturnValue({
      headers: null,
      loggedUser: { username: "" },
    });

    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/profile/jane",
            state: {
              bio: null,
              followersCount: 2,
              following: false,
              image: null,
            },
          },
        ]}
      >
        <Routes>
          <Route path="/profile/:username" element={<AuthorInfo />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("4 articles")).toBeInTheDocument();
    expect(screen.getByText("9 favorites")).toBeInTheDocument();
    expect(getProfile).toHaveBeenCalled();
  });
});

// Guard: before the fetch resolves, stats must not render as 0/0 — they
// should be absent entirely until real data arrives.
describe("AuthorInfo author stats — before load", () => {
  test("does not render a stats block before getProfile resolves", async () => {
    useAuth.mockReturnValue({
      headers: null,
      loggedUser: { username: "" },
    });

    let resolveProfile;
    getProfile.mockReset().mockReturnValue(
      new Promise((resolve) => {
        resolveProfile = resolve;
      }),
    );

    renderAuthorInfo("jane");

    expect(screen.queryByText(/articles$/)).not.toBeInTheDocument();
    expect(screen.queryByText(/favorites$/)).not.toBeInTheDocument();

    // let the pending fetch settle (inside act, via testing-library) so it
    // doesn't leak an unresolved promise/state update into other tests
    resolveProfile(profile);
    await screen.findByText("4 articles");
  });
});

// AC-135: whichever of website/github/twitter are set on the profile
// render as links; none set renders no links section at all.
describe("AuthorInfo social links", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      headers: null,
      loggedUser: { username: "" },
    });
  });

  test("renders a link for each set social link, pointing to its URL", async () => {
    getProfile.mockReset().mockResolvedValue(profileWithLinks);

    renderAuthorInfo("jane");

    expect(await screen.findByRole("link", { name: "Website" })).toHaveAttribute(
      "href",
      profileWithLinks.website,
    );
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      profileWithLinks.github,
    );
    expect(screen.getByRole("link", { name: "Twitter" })).toHaveAttribute(
      "href",
      profileWithLinks.twitter,
    );
  });

  test("renders no social links when none are set", async () => {
    getProfile.mockReset().mockResolvedValue(profileWithoutLinks);

    renderAuthorInfo("jane");

    await waitFor(() => expect(getProfile).toHaveBeenCalled());

    expect(screen.queryByRole("link", { name: "Website" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "GitHub" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Twitter" })).not.toBeInTheDocument();
  });
});
