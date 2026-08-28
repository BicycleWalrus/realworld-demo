import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "../../context/AuthContext";
import toggleReadLater from "../../services/toggleReadLater";
import SaveLaterButton from "./SaveLaterButton";

vi.mock("../../context/AuthContext");
vi.mock("../../services/toggleReadLater");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SaveLaterButton", () => {
  it("prompts to log in instead of saving when not authenticated", () => {
    useAuth.mockReturnValue({ headers: null, isAuth: false });
    window.alert = vi.fn();

    render(<SaveLaterButton isSaved={false} handler={vi.fn()} slug="a-slug" />);
    fireEvent.click(screen.getByRole("button"));

    expect(window.alert).toHaveBeenCalledWith("You need to login first");
    expect(toggleReadLater).not.toHaveBeenCalled();
  });

  // isSaved is the article's actual saved state (from the parent's own
  // data, appended server-side) - correct from the first render, not
  // just after a click, unlike the button's own local state before.
  it("reflects the isSaved prop on first render, before any click", () => {
    useAuth.mockReturnValue({ headers: {}, isAuth: true });

    render(<SaveLaterButton isSaved={true} handler={vi.fn()} slug="a-slug" />);

    expect(screen.getByRole("button", { name: /saved/i })).toBeInTheDocument();
  });

  it("toggles and hands the server's response to the handler when clicked", async () => {
    useAuth.mockReturnValue({ headers: {}, isAuth: true });
    toggleReadLater.mockResolvedValue({ slug: "a-slug", isSaved: true });
    const handler = vi.fn();

    render(<SaveLaterButton isSaved={false} handler={handler} slug="a-slug" />);
    expect(screen.getByRole("button", { name: /read later/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));

    expect(toggleReadLater).toHaveBeenCalledWith({
      slug: "a-slug",
      isSaved: false,
      headers: {},
    });
    await waitFor(() =>
      expect(handler).toHaveBeenCalledWith({ slug: "a-slug", isSaved: true }),
    );
  });
});
