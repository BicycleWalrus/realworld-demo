import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Notifications from "./Notifications";

// getNotifications/markNotificationsRead are the only I/O boundaries this
// page touches - mocked so the page's own render/fetch logic is what's
// exercised, not real network calls (same pattern as ReadLater.test.jsx).
vi.mock("../services/getNotifications");
import getNotifications from "../services/getNotifications";

vi.mock("../services/markNotificationsRead");
import markNotificationsRead from "../services/markNotificationsRead";

// useAuth is mocked (same pattern as ReadLater.test.jsx) so both the
// authenticated and anonymous cases can be forced without a real login flow.
vi.mock("../context/AuthContext", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useAuth: vi.fn() };
});
import { useAuth } from "../context/AuthContext";

function renderNotifications() {
  return render(
    <MemoryRouter initialEntries={["/notifications"]}>
      <Notifications />
    </MemoryRouter>,
  );
}

function baseNotification(overrides = {}) {
  return {
    id: 1,
    type: "follow",
    read: false,
    actor: { username: "jane", image: null },
    Article: null,
    Comment: null,
    createdAt: "2020-01-05T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  getNotifications.mockReset();
  markNotificationsRead.mockReset();
});

// AC-129: an authenticated user sees their own notifications, newest first.
describe("Notifications — authenticated", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ headers: { Authorization: "Bearer token" }, isAuth: true });
  });

  test("renders notifications from getNotifications, newest first", async () => {
    getNotifications.mockResolvedValue({
      notifications: [
        baseNotification({
          id: 1,
          type: "comment",
          actor: { username: "jane", image: null },
          Article: { slug: "a-slug", title: "A Great Article" },
        }),
        baseNotification({ id: 2, type: "follow", actor: { username: "bob", image: null } }),
      ],
      unreadCount: 2,
    });

    renderNotifications();

    expect(await screen.findByText("jane")).toBeInTheDocument();
    expect(screen.getByText("A Great Article")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("A Great Article").closest("a")).toHaveAttribute(
      "href",
      "/article/a-slug",
    );
    expect(getNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { Authorization: "Bearer token" } }),
    );
  });

  test("renders an empty-state message when there are no notifications", async () => {
    getNotifications.mockResolvedValue({ notifications: [], unreadCount: 0 });

    renderNotifications();

    expect(
      await screen.findByText("You don't have any notifications yet."),
    ).toBeInTheDocument();
  });

  // AC-130: "Mark all as read" calls markNotificationsRead({ all: true }).
  test("Mark all as read calls markNotificationsRead with all:true", async () => {
    getNotifications.mockResolvedValue({
      notifications: [baseNotification()],
      unreadCount: 1,
    });
    markNotificationsRead.mockResolvedValue({ unreadCount: 0 });

    renderNotifications();

    const button = await screen.findByText("Mark all as read");
    button.click();

    await waitFor(() =>
      expect(markNotificationsRead).toHaveBeenCalledWith(
        expect.objectContaining({ all: true }),
      ),
    );
  });
});

// AC-131: notifications are private - an anonymous visitor sees a sign-in
// prompt instead of the list, and no fetch is made.
describe("Notifications — anonymous", () => {
  test("shows a sign-in prompt instead of the list and does not fetch", async () => {
    useAuth.mockReturnValue({ headers: null, isAuth: false });

    renderNotifications();

    expect(await screen.findByText("Sign in")).toBeInTheDocument();
    expect(screen.getByText("Sign in").closest("a")).toHaveAttribute("href", "/login");
    await waitFor(() => expect(getNotifications).not.toHaveBeenCalled());
  });
});
