import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, test, vi } from "vitest";
import * as AuthContext from "../../context/AuthContext";
import getNotifications from "../../services/getNotifications";
import markNotificationsRead from "../../services/markNotificationsRead";
import NotificationBell from "./NotificationBell";

vi.mock("../../services/getNotifications");
vi.mock("../../services/markNotificationsRead");

afterEach(() => {
  vi.restoreAllMocks();
  getNotifications.mockReset();
  markNotificationsRead.mockReset();
});

function renderBell() {
  vi.spyOn(AuthContext, "useAuth").mockReturnValue({ headers: {}, isAuth: true });

  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>,
  );
}

test("shows the unread count as a badge", async () => {
  getNotifications.mockResolvedValue({
    notifications: [{ id: 1, read: false, type: "follow" }],
    unreadCount: 1,
  });

  renderBell();

  await waitFor(() => expect(screen.getByText("( 1 )")).toBeInTheDocument());
});

test("opening the dropdown lists the fetched notifications", async () => {
  getNotifications.mockResolvedValue({
    notifications: [{ actor: { username: "jane" }, id: 1, read: false, type: "follow" }],
    unreadCount: 1,
  });

  renderBell();
  await waitFor(() => expect(getNotifications).toHaveBeenCalledTimes(1));

  await userEvent.click(screen.getByText("( 1 )"));

  expect(await screen.findByText("jane followed you")).toBeInTheDocument();
  expect(getNotifications).toHaveBeenCalledTimes(2);
});

test("clicking a notification marks it read and refetches", async () => {
  getNotifications.mockResolvedValue({
    notifications: [{ actor: { username: "jane" }, id: 1, read: false, type: "follow" }],
    unreadCount: 1,
  });
  markNotificationsRead.mockResolvedValue({});

  renderBell();
  await waitFor(() => expect(getNotifications).toHaveBeenCalledTimes(1));

  await userEvent.click(screen.getByText("( 1 )"));
  await userEvent.click(await screen.findByText("jane followed you"));

  expect(markNotificationsRead).toHaveBeenCalledWith({ headers: {}, id: 1 });
  await waitFor(() => expect(getNotifications).toHaveBeenCalledTimes(3));
});

test("marking all as read sends the explicit all flag and refetches", async () => {
  getNotifications.mockResolvedValue({
    notifications: [{ actor: { username: "jane" }, id: 1, read: false, type: "follow" }],
    unreadCount: 1,
  });
  markNotificationsRead.mockResolvedValue({});

  renderBell();
  await waitFor(() => expect(getNotifications).toHaveBeenCalledTimes(1));

  await userEvent.click(screen.getByText("( 1 )"));
  await userEvent.click(await screen.findByText("Mark all as read"));

  expect(markNotificationsRead).toHaveBeenCalledWith({ all: true, headers: {} });
  await waitFor(() => expect(getNotifications).toHaveBeenCalledTimes(3));
});

test("no notifications shows an empty-state message", async () => {
  getNotifications.mockResolvedValue({ notifications: [], unreadCount: 0 });

  renderBell();

  expect(await screen.findByText("No notifications yet")).toBeInTheDocument();
});
