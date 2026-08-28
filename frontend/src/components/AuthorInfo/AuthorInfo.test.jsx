import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AuthProvider from "../../context/AuthContext";
import AuthorInfo from "./AuthorInfo";

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
    ...overrides,
  };
}

it("renders no social links section when none are set", () => {
  renderProfile(makeAuthorState());

  expect(screen.queryByRole("link", { name: /website/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /github/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /twitter/i })).not.toBeInTheDocument();
});

it("renders only the social links that are set", () => {
  renderProfile(makeAuthorState({ website: "https://jane.dev" }));

  expect(screen.getByRole("link", { name: /website/i })).toHaveAttribute(
    "href",
    "https://jane.dev",
  );
  expect(screen.queryByRole("link", { name: /github/i })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /twitter/i })).not.toBeInTheDocument();
});

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
