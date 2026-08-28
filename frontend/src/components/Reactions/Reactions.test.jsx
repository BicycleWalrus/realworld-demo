import { fireEvent, render, screen } from "@testing-library/react";
import Reactions from "./Reactions";

// setReaction/removeReaction are the only I/O boundary this component
// touches - mocked so the button's own click/state logic is what's
// exercised (same pattern as ReadLaterButton.test.jsx).
vi.mock("../../services/setReaction", () => ({
  default: vi.fn(),
  removeReaction: vi.fn(),
}));
import setReaction, { removeReaction } from "../../services/setReaction";

// useAuth is mocked (same pattern as ReadLaterButton.test.jsx) so both the
// authenticated and anonymous cases can be forced without a real login flow.
vi.mock("../../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuth: vi.fn() };
});
import { useAuth } from "../../context/AuthContext";

const reactionCounts = { like: 3, insightful: 1, celebrate: 0 };

beforeEach(() => {
  setReaction.mockReset();
  removeReaction.mockReset();
});

// AC-125/AC-126: reaction counts render for every fixed type, and the
// viewer's own current reaction is visually marked active.
describe("Reactions — rendering", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ headers: { Authorization: "Bearer token" }, isAuth: true });
  });

  test("renders each reaction type with its count", () => {
    render(<Reactions reactionCounts={reactionCounts} reaction={null} slug="a-slug" handler={vi.fn()} />);

    expect(screen.getByText("Like")).toBeInTheDocument();
    expect(screen.getByText("( 3 )")).toBeInTheDocument();
    expect(screen.getByText("Insightful")).toBeInTheDocument();
    expect(screen.getByText("( 1 )")).toBeInTheDocument();
    expect(screen.getByText("Celebrate")).toBeInTheDocument();
    expect(screen.getByText("( 0 )")).toBeInTheDocument();
  });

  test("marks the viewer's current reaction as active", () => {
    render(<Reactions reactionCounts={reactionCounts} reaction="insightful" slug="a-slug" handler={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Insightful/ })).toHaveClass("active");
    expect(screen.getByRole("button", { name: /Like/ })).not.toHaveClass("active");
  });
});

// AC-125: an authenticated user can set, change, or remove their reaction.
describe("Reactions — authenticated", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ headers: { Authorization: "Bearer token" }, isAuth: true });
  });

  test("clicking a new reaction type calls setReaction and invokes handler", async () => {
    setReaction.mockResolvedValue({ reactionCounts: { like: 4, insightful: 1, celebrate: 0 }, reaction: "like" });
    const handler = vi.fn();

    render(<Reactions reactionCounts={reactionCounts} reaction={null} slug="a-slug" handler={handler} />);
    fireEvent.click(screen.getByRole("button", { name: /Like/ }));

    expect(setReaction).toHaveBeenCalledWith({
      slug: "a-slug",
      type: "like",
      headers: { Authorization: "Bearer token" },
    });
    expect(removeReaction).not.toHaveBeenCalled();
    // Waits for the click's promise chain to resolve (same pattern as
    // ReadLaterButton.test.jsx) - the component is controlled by its props,
    // so the rendered counts only change once the parent applies `handler`'s
    // result, which is asserted separately below.
    await screen.findByText("Like");
    expect(handler).toHaveBeenCalledWith({
      reactionCounts: { like: 4, insightful: 1, celebrate: 0 },
      reaction: "like",
    });
  });

  test("clicking the current reaction calls removeReaction, not setReaction", async () => {
    removeReaction.mockResolvedValue({ reactionCounts: { like: 2, insightful: 1, celebrate: 0 }, reaction: null });
    const handler = vi.fn();

    render(<Reactions reactionCounts={reactionCounts} reaction="like" slug="a-slug" handler={handler} />);
    fireEvent.click(screen.getByRole("button", { name: /Like/ }));

    expect(removeReaction).toHaveBeenCalledWith({ slug: "a-slug", headers: { Authorization: "Bearer token" } });
    expect(setReaction).not.toHaveBeenCalled();
    await screen.findByText("Like");
    expect(handler).toHaveBeenCalledWith({ reactionCounts: { like: 2, insightful: 1, celebrate: 0 }, reaction: null });
  });

  test("switching from one reaction to a different one calls setReaction with the new type", () => {
    setReaction.mockResolvedValue({ reactionCounts, reaction: "celebrate" });

    render(<Reactions reactionCounts={reactionCounts} reaction="like" slug="a-slug" handler={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Celebrate/ }));

    expect(setReaction).toHaveBeenCalledWith({
      slug: "a-slug",
      type: "celebrate",
      headers: { Authorization: "Bearer token" },
    });
  });
});

// Mirrors FavButton/ReadLaterButton's anonymous-visitor behavior: clicking
// prompts login instead of calling either service.
describe("Reactions — anonymous", () => {
  test("clicking alerts the visitor to log in and does not call setReaction or removeReaction", () => {
    useAuth.mockReturnValue({ headers: null, isAuth: false });
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<Reactions reactionCounts={reactionCounts} reaction={null} slug="a-slug" handler={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Like/ }));

    expect(alertSpy).toHaveBeenCalledWith("You need to login first");
    expect(setReaction).not.toHaveBeenCalled();
    expect(removeReaction).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });
});
