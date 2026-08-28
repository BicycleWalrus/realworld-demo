import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toggleFollow from "../../services/toggleFollow";
import UserCard from "./UserCard";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

// markdown-to-jsx's default export doesn't transform cleanly under this
// project's Vitest SSR setup; stub it to render children as plain text,
// matching how it's already avoided in other component tests in this repo.
vi.mock("markdown-to-jsx", () => ({
  default: ({ children }) => children,
}));

vi.mock("../../services/toggleFollow", () => ({
  default: vi.fn(),
}));

const profile = {
  bio: "Writes about dragons.",
  followersCount: 2,
  following: false,
  image: null,
  username: "jane",
};

function renderCard({ loggedUsername, updateProfile = () => {} } = {}) {
  useAuth.mockReturnValue({
    headers: null,
    isAuth: !!loggedUsername,
    loggedUser: { username: loggedUsername || "" },
  });

  render(
    <MemoryRouter>
      <UserCard {...profile} updateProfile={updateProfile} />
    </MemoryRouter>
  );
}

// AC-094: an unauthenticated visitor sees a read-only follower count and no
// follow action is performed.
it("shows a read-only follower count for an anonymous visitor, without performing a follow action", async () => {
  renderCard({ loggedUsername: undefined });

  expect(screen.getByText(/followers/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button"));

  expect(toggleFollow).not.toHaveBeenCalled();
});

// AC-093: an authenticated visitor can follow a listed user directly from
// the card, without navigating away from the directory page.
it("lets an authenticated visitor follow a listed user directly from the card", async () => {
  toggleFollow.mockResolvedValue({ ...profile, followersCount: 3, following: true });
  const updateProfile = vi.fn();
  renderCard({ loggedUsername: "reader", updateProfile });

  await userEvent.click(screen.getByRole("button", { name: /follow/i }));

  expect(toggleFollow).toHaveBeenCalledWith(
    expect.objectContaining({ following: false, username: "jane" })
  );
  await waitFor(() =>
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ following: true, followersCount: 3, username: "jane" })
    )
  );
});

// AC-092: the card links to the user's full profile page.
it("links the card to the user's full profile page", () => {
  renderCard();

  expect(screen.getByRole("link")).toHaveAttribute("href", "/profile/jane");
});
