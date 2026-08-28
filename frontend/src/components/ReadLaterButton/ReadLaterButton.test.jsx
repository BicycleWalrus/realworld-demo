import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "../../context/AuthContext";
import toggleReadLater from "../../services/toggleReadLater";
import ReadLaterButton from "./ReadLaterButton";

vi.mock("../../context/AuthContext");
vi.mock("../../services/toggleReadLater");

describe("ReadLaterButton", () => {
  beforeEach(() => {
    toggleReadLater.mockReset();
  });

  // AC-086: an anonymous visitor clicking the button is alerted to log in
  // rather than saving anything, consistent with favoriting (REQ-025).
  test("anonymous visitor is alerted to log in instead of saving", async () => {
    useAuth.mockReturnValue({ headers: null, isAuth: false });
    window.alert = vi.fn();
    const user = userEvent.setup();

    render(<ReadLaterButton handler={vi.fn()} readLater={false} slug="a-slug" />);
    await user.click(screen.getByRole("button"));

    expect(window.alert).toHaveBeenCalledWith("You need to login first");
    expect(toggleReadLater).not.toHaveBeenCalled();
  });

  // AC-083: reflects the current read-later status via props, same
  // controlled-component pattern as FavButton.
  test.each([
    [true, /Saved for Later/],
    [false, /Read Later/],
  ])("readLater=%p renders %p", (readLater, expectedText) => {
    useAuth.mockReturnValue({ headers: {}, isAuth: true });

    render(<ReadLaterButton handler={vi.fn()} readLater={readLater} slug="a-slug" />);

    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  // AC-083/AC-084: clicking calls the service and reports the new status
  // back up via the handler, so both places a button is rendered for the
  // same article (banner + near-comments) can stay in sync.
  test("authenticated click toggles via the service and reports back through handler", async () => {
    useAuth.mockReturnValue({ headers: { Authorization: "Token t" }, isAuth: true });
    toggleReadLater.mockResolvedValue({ readLater: true });
    const handler = vi.fn();
    const user = userEvent.setup();

    render(<ReadLaterButton handler={handler} readLater={false} slug="a-slug" />);
    await user.click(screen.getByRole("button"));

    expect(toggleReadLater).toHaveBeenCalledWith({
      slug: "a-slug",
      readLater: false,
      headers: { Authorization: "Token t" },
    });
    expect(handler).toHaveBeenCalledWith(true);
  });
});
