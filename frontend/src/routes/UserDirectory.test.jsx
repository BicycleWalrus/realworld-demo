import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import getUserDirectory from "../services/getUserDirectory";
import UserDirectory from "./UserDirectory";

vi.mock("../services/getUserDirectory");

function renderDirectory() {
  return render(
    <MemoryRouter>
      <UserDirectory />
    </MemoryRouter>,
  );
}

describe("UserDirectory", () => {
  it("renders each author with a link to their profile and a bio snippet", async () => {
    getUserDirectory.mockResolvedValue({
      users: [
        { username: "jane", image: null, bio: "Hello there" },
        { username: "bob", image: null, bio: null },
      ],
      usersCount: 2,
    });

    renderDirectory();

    expect(await screen.findByText("jane")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /jane/ })).toHaveAttribute(
      "href",
      "/profile/jane",
    );
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /bob/ })).toHaveAttribute(
      "href",
      "/profile/bob",
    );
  });

  it("shows a message when there are no authors", async () => {
    getUserDirectory.mockResolvedValue({ users: [], usersCount: 0 });

    renderDirectory();

    expect(await screen.findByText("No authors found.")).toBeInTheDocument();
  });

  it("truncates a bio longer than 100 characters", async () => {
    const longBio = "a".repeat(150);
    getUserDirectory.mockResolvedValue({
      users: [{ username: "jane", image: null, bio: longBio }],
      usersCount: 1,
    });

    renderDirectory();

    expect(await screen.findByText(`${"a".repeat(100)}...`)).toBeInTheDocument();
  });

  // The truncation cutoff can land exactly on a multi-byte character (e.g.
  // an emoji, which is a UTF-16 surrogate pair) - it must not be split in
  // half into a broken/unpaired-surrogate glyph.
  it("truncates without splitting a multi-byte character at the cutoff", async () => {
    const bioWithEmoji = `${"a".repeat(99)}😀 more text past the cutoff`;
    getUserDirectory.mockResolvedValue({
      users: [{ username: "jane", image: null, bio: bioWithEmoji }],
      usersCount: 1,
    });

    renderDirectory();

    expect(await screen.findByText(`${"a".repeat(99)}😀...`)).toBeInTheDocument();
  });

  it("requests the next page of authors on page change", async () => {
    getUserDirectory.mockResolvedValue({
      users: Array.from({ length: 20 }, (_, i) => ({
        username: `user${i}`,
        image: null,
        bio: null,
      })),
      usersCount: 40,
    });

    renderDirectory();

    await screen.findByText("user0");
    fireEvent.click(screen.getByRole("button", { name: "Page 2" }));

    await waitFor(() =>
      expect(getUserDirectory).toHaveBeenCalledWith({ page: 1 }),
    );
  });
});
