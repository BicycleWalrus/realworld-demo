import { fireEvent, render, screen } from "@testing-library/react";
import ReadLaterButton from "./ReadLaterButton";

// toggleReadLater is the only I/O boundary this component touches -
// mocked so the button's own click/state logic is what's exercised.
vi.mock("../../services/toggleReadLater");
import toggleReadLater from "../../services/toggleReadLater";

// useAuth is mocked (same pattern as ArticlesPreview.test.jsx) so both the
// authenticated and anonymous cases can be forced without a real login flow.
vi.mock("../../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuth: vi.fn() };
});
import { useAuth } from "../../context/AuthContext";

beforeEach(() => {
  toggleReadLater.mockReset();
});

// AC-117: an authenticated user can save/unsave an article via this button.
describe("ReadLaterButton — authenticated", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ headers: { Authorization: "Bearer token" }, isAuth: true });
  });

  test("clicking an unsaved article calls toggleReadLater with saved:false and invokes handler", async () => {
    toggleReadLater.mockResolvedValue({ slug: "a-slug", readLater: true });
    const handler = vi.fn();

    render(<ReadLaterButton readLater={false} slug="a-slug" handler={handler} />);
    fireEvent.click(screen.getByRole("button"));

    expect(toggleReadLater).toHaveBeenCalledWith({
      slug: "a-slug",
      saved: false,
      headers: { Authorization: "Bearer token" },
    });
    await screen.findByText("Read Later");
    expect(handler).toHaveBeenCalledWith({ slug: "a-slug", readLater: true });
  });

  test("clicking a saved article calls toggleReadLater with saved:true", () => {
    toggleReadLater.mockResolvedValue({ slug: "a-slug", readLater: false });

    render(<ReadLaterButton readLater={true} slug="a-slug" handler={vi.fn()} />);
    fireEvent.click(screen.getByRole("button"));

    expect(toggleReadLater).toHaveBeenCalledWith({
      slug: "a-slug",
      saved: true,
      headers: { Authorization: "Bearer token" },
    });
  });

  test("renders an active state and 'Saved' label when readLater is true", () => {
    render(<ReadLaterButton readLater={true} slug="a-slug" handler={vi.fn()} />);

    expect(screen.getByRole("button")).toHaveClass("active");
    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  test("renders no active state and 'Read Later' label when readLater is false", () => {
    render(<ReadLaterButton readLater={false} slug="a-slug" handler={vi.fn()} />);

    expect(screen.getByRole("button")).not.toHaveClass("active");
    expect(screen.getByText("Read Later")).toBeInTheDocument();
  });
});

// Mirrors FavButton's anonymous-visitor behavior: clicking prompts login
// instead of calling the service.
describe("ReadLaterButton — anonymous", () => {
  test("clicking alerts the visitor to log in and does not call toggleReadLater", () => {
    useAuth.mockReturnValue({ headers: null, isAuth: false });
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<ReadLaterButton readLater={false} slug="a-slug" handler={vi.fn()} />);
    fireEvent.click(screen.getByRole("button"));

    expect(alertSpy).toHaveBeenCalledWith("You need to login first");
    expect(toggleReadLater).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
