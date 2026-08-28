import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import * as AuthContext from "../../context/AuthContext";
import toggleReaction from "../../services/toggleReaction";
import ReactionBar from "./ReactionBar";

vi.mock("../../services/toggleReaction");

afterEach(() => {
  vi.restoreAllMocks();
  toggleReaction.mockReset();
});

test("renders each reaction type's count", () => {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({ headers: {}, isAuth: true });

  render(
    <ReactionBar
      handler={vi.fn()}
      myReaction={null}
      reactions={{ celebrate: 1, insightful: 0, like: 3 }}
      slug="a-slug"
    />,
  );

  const buttons = screen.getAllByRole("button");
  expect(buttons[0]).toHaveTextContent("3");
  expect(buttons[1]).toHaveTextContent("0");
  expect(buttons[2]).toHaveTextContent("1");
});

test("anonymous click alerts instead of calling the service", async () => {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({ headers: {}, isAuth: false });
  vi.spyOn(window, "alert").mockImplementation(() => {});

  render(<ReactionBar handler={vi.fn()} myReaction={null} reactions={{}} slug="a-slug" />);
  await userEvent.click(screen.getAllByRole("button")[0]);

  expect(window.alert).toHaveBeenCalledWith("You need to login first");
  expect(toggleReaction).not.toHaveBeenCalled();
});

test("authenticated click on a new type sets it", async () => {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({ headers: {}, isAuth: true });
  toggleReaction.mockResolvedValue({ myReaction: "like", reactions: { like: 1 } });

  render(<ReactionBar handler={vi.fn()} myReaction={null} reactions={{}} slug="a-slug" />);
  await userEvent.click(screen.getAllByRole("button")[0]);

  expect(toggleReaction).toHaveBeenCalledWith({
    headers: {},
    remove: false,
    slug: "a-slug",
    type: "like",
  });
});

test("authenticated click on the already-active type removes it", async () => {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({ headers: {}, isAuth: true });
  toggleReaction.mockResolvedValue({ myReaction: null, reactions: { like: 0 } });

  render(<ReactionBar handler={vi.fn()} myReaction="like" reactions={{ like: 1 }} slug="a-slug" />);
  await userEvent.click(screen.getAllByRole("button")[0]);

  expect(toggleReaction).toHaveBeenCalledWith({
    headers: {},
    remove: true,
    slug: "a-slug",
    type: "like",
  });
});

test("authenticated click on a different type changes the reaction", async () => {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({ headers: {}, isAuth: true });
  toggleReaction.mockResolvedValue({ myReaction: "celebrate", reactions: {} });

  render(<ReactionBar handler={vi.fn()} myReaction="like" reactions={{}} slug="a-slug" />);
  await userEvent.click(screen.getAllByRole("button")[2]);

  expect(toggleReaction).toHaveBeenCalledWith({
    headers: {},
    remove: false,
    slug: "a-slug",
    type: "celebrate",
  });
});

test("passes the resolved article to the handler", async () => {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({ headers: {}, isAuth: true });
  const article = { myReaction: "like", reactions: { like: 1 } };
  toggleReaction.mockResolvedValue(article);
  const handler = vi.fn();

  render(<ReactionBar handler={handler} myReaction={null} reactions={{}} slug="a-slug" />);
  await userEvent.click(screen.getAllByRole("button")[0]);

  expect(handler).toHaveBeenCalledWith(article);
});
