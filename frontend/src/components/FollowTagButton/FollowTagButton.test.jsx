import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "../../context/AuthContext";
import { useFeedContext } from "../../context/FeedContext";
import getTag from "../../services/getTag";
import toggleFollowTag from "../../services/toggleFollowTag";
import FollowTagButton from "./FollowTagButton";

vi.mock("../../context/AuthContext");
vi.mock("../../context/FeedContext");
vi.mock("../../services/getTag");
vi.mock("../../services/toggleFollowTag");

function mockContexts({ isAuth, tabName = "tag", tagName = "dragons" } = {}) {
  useAuth.mockReturnValue({
    headers: isAuth ? { Authorization: "Bearer t" } : null,
    isAuth: !!isAuth,
  });
  useFeedContext.mockReturnValue({ tabName, tagName });
}

beforeEach(() => {
  vi.clearAllMocks();
  getTag.mockResolvedValue({ name: "dragons", following: false });
});

// AC-150/AC-154 (REQ-065)
describe("FollowTagButton", () => {
  it("renders nothing for an unauthenticated visitor", () => {
    mockContexts({ isAuth: false });
    render(<FollowTagButton />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(getTag).not.toHaveBeenCalled();
  });

  it("renders nothing outside a tag tab", () => {
    mockContexts({ isAuth: true, tabName: "global" });
    render(<FollowTagButton />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the server-reported follow state for the active tag", async () => {
    mockContexts({ isAuth: true });
    getTag.mockResolvedValue({ name: "dragons", following: true });
    render(<FollowTagButton />);

    expect(await screen.findByRole("button", { name: "Unfollow #dragons" })).toBeInTheDocument();
  });

  it("toggles via the service and reflects the server's response", async () => {
    mockContexts({ isAuth: true });
    toggleFollowTag.mockResolvedValue({ name: "dragons", following: true });
    render(<FollowTagButton />);

    const button = await screen.findByRole("button", { name: "Follow #dragons" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Unfollow #dragons" })).toBeInTheDocument();
    });
    expect(toggleFollowTag).toHaveBeenCalledWith(
      expect.objectContaining({ follow: true, name: "dragons" }),
    );
  });
});
