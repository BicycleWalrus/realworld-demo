import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useAuth } from "../../context/AuthContext";
import toggleReaction from "../../services/toggleReaction";
import ReactionButtons from "./ReactionButtons";

vi.mock("../../context/AuthContext");
vi.mock("../../services/toggleReaction");

const counts = { like: 2, insightful: 1, celebrate: 0 };

describe("ReactionButtons", () => {
  beforeEach(() => {
    toggleReaction.mockReset();
  });

  // AC-083: an anonymous visitor is alerted to log in rather than a
  // request being sent, consistent with favoriting (REQ-025).
  test("anonymous visitor is alerted to log in instead of reacting", async () => {
    useAuth.mockReturnValue({ headers: null, isAuth: false });
    window.alert = vi.fn();
    const user = userEvent.setup();

    render(
      <ReactionButtons handler={vi.fn()} myReaction={null} reactionsCounts={counts} slug="a-slug" />,
    );
    await user.click(screen.getByRole("button", { name: /Like/ }));

    expect(window.alert).toHaveBeenCalledWith("You need to login first");
    expect(toggleReaction).not.toHaveBeenCalled();
  });

  // AC-082: counts for every fixed type are displayed, regardless of
  // whether the visitor is authenticated.
  test("renders the count for each fixed reaction type", () => {
    useAuth.mockReturnValue({ headers: null, isAuth: false });

    render(
      <ReactionButtons handler={vi.fn()} myReaction={null} reactionsCounts={counts} slug="a-slug" />,
    );

    expect(screen.getByRole("button", { name: /Like.*\(\s*2\s*\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Insightful.*\(\s*1\s*\)/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Celebrate.*\(\s*0\s*\)/ })).toBeInTheDocument();
  });

  // AC-080: clicking a different reaction sets/changes it.
  test("authenticated click sets a reaction and reports back through handler", async () => {
    useAuth.mockReturnValue({ headers: { Authorization: "Token t" }, isAuth: true });
    toggleReaction.mockResolvedValue({
      reactionsCounts: { like: 2, insightful: 2, celebrate: 0 },
      myReaction: "insightful",
    });
    const handler = vi.fn();
    const user = userEvent.setup();

    render(
      <ReactionButtons handler={handler} myReaction={null} reactionsCounts={counts} slug="a-slug" />,
    );
    await user.click(screen.getByRole("button", { name: /Insightful/ }));

    expect(toggleReaction).toHaveBeenCalledWith({
      slug: "a-slug",
      type: "insightful",
      headers: { Authorization: "Token t" },
    });
    expect(handler).toHaveBeenCalledWith(
      { like: 2, insightful: 2, celebrate: 0 },
      "insightful",
    );
  });

  // AC-081: clicking the already-active reaction removes it instead of
  // re-setting the same value.
  test("clicking the already-active reaction removes it", async () => {
    useAuth.mockReturnValue({ headers: { Authorization: "Token t" }, isAuth: true });
    toggleReaction.mockResolvedValue({
      reactionsCounts: { like: 1, insightful: 1, celebrate: 0 },
      myReaction: null,
    });
    const user = userEvent.setup();

    render(
      <ReactionButtons handler={vi.fn()} myReaction="like" reactionsCounts={counts} slug="a-slug" />,
    );
    await user.click(screen.getByRole("button", { name: /Like/ }));

    expect(toggleReaction).toHaveBeenCalledWith({
      slug: "a-slug",
      type: null,
      headers: { Authorization: "Token t" },
    });
  });
});
