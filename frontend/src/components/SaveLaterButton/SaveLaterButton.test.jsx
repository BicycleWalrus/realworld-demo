import { fireEvent, render, screen } from "@testing-library/react";
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

    render(<SaveLaterButton slug="a-slug" />);
    fireEvent.click(screen.getByRole("button"));

    expect(window.alert).toHaveBeenCalledWith("You need to login first");
    expect(toggleReadLater).not.toHaveBeenCalled();
  });

  it("saves the article and updates its label when clicked", async () => {
    useAuth.mockReturnValue({ headers: {}, isAuth: true });
    toggleReadLater.mockResolvedValue({ slug: "a-slug", isSaved: true });

    render(<SaveLaterButton slug="a-slug" />);
    expect(screen.getByRole("button", { name: /read later/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));

    expect(toggleReadLater).toHaveBeenCalledWith({
      slug: "a-slug",
      isSaved: false,
      headers: {},
    });
    expect(await screen.findByRole("button", { name: /saved/i })).toBeInTheDocument();
  });
});
