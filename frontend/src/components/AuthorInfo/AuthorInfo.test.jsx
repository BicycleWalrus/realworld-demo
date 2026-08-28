import { render } from "@testing-library/react";
import { useLocation } from "react-router-dom";
import AuthorInfo from "./AuthorInfo";

// AuthorInfo reads its initial author data from router location `state`
// (`useLocation().state`), and only falls back to fetching via `getProfile`
// when that state is missing/stale. Providing `state` directly lets these
// tests exercise the rendered output without mocking the network call.
vi.mock("react-router-dom", () => ({
  useLocation: vi.fn(),
  useParams: () => ({ username: "author" }),
  useNavigate: () => vi.fn(),
  Link: ({ children, to }) => <a href={to}>{children}</a>,
}));

vi.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ headers: {}, loggedUser: { username: "reader" } }),
}));

function renderWithState(state) {
  useLocation.mockReturnValue({ state });
  return render(<AuthorInfo />);
}

describe("AuthorInfo social links", () => {
  // AC-083: a profile with no social links set renders exactly as before -
  // no social links list is rendered at all (no placeholder, no layout shift).
  test("renders no social links block when none are set", () => {
    const { container } = renderWithState({
      bio: "",
      followersCount: 0,
      following: false,
    });

    expect(container.querySelector(".social-links")).toBeNull();
  });

  // AC-082: each set social link is displayed as a link to the submitted URL.
  test("renders a link for each social link field that is set", () => {
    const { container } = renderWithState({
      bio: "",
      followersCount: 0,
      following: false,
      websiteUrl: "https://author.example",
      githubUrl: "https://github.com/author",
      twitterUrl: "https://twitter.com/author",
    });

    expect(
      container.querySelector('a[href="https://author.example"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('a[href="https://github.com/author"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('a[href="https://twitter.com/author"]'),
    ).not.toBeNull();
  });

  // AC-082: fields left unset render no link for that field individually.
  test("renders only the links that are set", () => {
    const { container } = renderWithState({
      bio: "",
      followersCount: 0,
      following: false,
      githubUrl: "https://github.com/author",
    });

    expect(container.querySelectorAll(".social-links a")).toHaveLength(1);
    expect(
      container.querySelector('a[href="https://github.com/author"]'),
    ).not.toBeNull();
  });
});
