import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import * as AuthContext from "../../context/AuthContext";
import toggleReadLater from "../../services/toggleReadLater";
import ReadLaterButton from "./ReadLaterButton";

vi.mock("../../services/toggleReadLater");

afterEach(() => {
  vi.restoreAllMocks();
  toggleReadLater.mockReset();
});

test("unauthenticated click alerts instead of calling the service", async () => {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({ headers: {}, isAuth: false });
  vi.spyOn(window, "alert").mockImplementation(() => {});

  render(<ReadLaterButton handler={vi.fn()} readLater={false} slug="a-slug" />);
  await userEvent.click(screen.getByRole("button"));

  expect(window.alert).toHaveBeenCalledWith("You need to login first");
  expect(toggleReadLater).not.toHaveBeenCalled();
});

test("renders as unsaved and calls the service with readLater=false", async () => {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({ headers: {}, isAuth: true });
  toggleReadLater.mockResolvedValue({ readLater: true });

  render(<ReadLaterButton handler={vi.fn()} readLater={false} slug="a-slug" />);

  expect(screen.getByRole("button")).toHaveTextContent("Read Later");

  await userEvent.click(screen.getByRole("button"));

  expect(toggleReadLater).toHaveBeenCalledWith({ headers: {}, readLater: false, slug: "a-slug" });
});

test("renders as saved and calls the service with readLater=true", async () => {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({ headers: {}, isAuth: true });
  toggleReadLater.mockResolvedValue({ readLater: false });

  render(<ReadLaterButton handler={vi.fn()} readLater={true} slug="a-slug" />);

  expect(screen.getByRole("button")).toHaveTextContent("Saved");

  await userEvent.click(screen.getByRole("button"));

  expect(toggleReadLater).toHaveBeenCalledWith({ headers: {}, readLater: true, slug: "a-slug" });
});

test("passes the resolved article to the handler so the parent can sync state", async () => {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({ headers: {}, isAuth: true });
  const article = { readLater: true, slug: "a-slug" };
  toggleReadLater.mockResolvedValue(article);
  const handler = vi.fn();

  render(<ReadLaterButton handler={handler} readLater={false} slug="a-slug" />);
  await userEvent.click(screen.getByRole("button"));

  expect(handler).toHaveBeenCalledWith(article);
});
