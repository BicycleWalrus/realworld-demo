import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Directory from "./Directory";

// getProfiles is the only I/O boundary Directory touches for this data —
// mocked so the component's own render/pagination logic is what's
// exercised, not real network calls.
vi.mock("../services/getProfiles");
import getProfiles from "../services/getProfiles";

function renderDirectory() {
  return render(
    <MemoryRouter initialEntries={["/directory"]}>
      <Directory />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getProfiles.mockReset();
});

// REQ-074/REQ-076: the directory lists usernames, avatars, and bio
// snippets, each entry linking to that user's full profile page.
describe("Directory — rendering profiles", () => {
  test("renders usernames linking to /profile/<username>", async () => {
    getProfiles.mockResolvedValue({
      profiles: [
        { username: "jane", bio: "hi there", image: null },
        { username: "bob", bio: null, image: null },
      ],
      profilesCount: 2,
    });

    renderDirectory();

    expect(await screen.findByText("jane")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();

    expect(screen.getByText("jane").closest("a")).toHaveAttribute(
      "href",
      "/profile/jane",
    );
    expect(screen.getByText("bob").closest("a")).toHaveAttribute(
      "href",
      "/profile/bob",
    );
  });
});

// REQ-074: bounded page size — a pagination control is rendered when
// profilesCount exceeds a single page.
describe("Directory — pagination", () => {
  test("renders a pagination control when profilesCount exceeds the page size", async () => {
    getProfiles.mockResolvedValue({
      profiles: [{ username: "jane", bio: null, image: null }],
      profilesCount: 25,
    });

    renderDirectory();

    await waitFor(() => expect(getProfiles).toHaveBeenCalled());

    expect(await screen.findByText("jane")).toBeInTheDocument();
    expect(document.querySelector(".pagination")).not.toBeNull();
  });

  test("does not render a pagination control when everything fits on one page", async () => {
    getProfiles.mockResolvedValue({
      profiles: [{ username: "jane", bio: null, image: null }],
      profilesCount: 1,
    });

    renderDirectory();

    expect(await screen.findByText("jane")).toBeInTheDocument();
    expect(document.querySelector(".pagination")).toBeNull();
  });
});

// REQ-075: the directory renders for anonymous visitors — it does not
// require an auth context/provider to function.
describe("Directory — anonymous access", () => {
  test("renders without any auth provider", async () => {
    getProfiles.mockResolvedValue({ profiles: [], profilesCount: 0 });

    renderDirectory();

    expect(await screen.findByText("No users yet.")).toBeInTheDocument();
  });
});
