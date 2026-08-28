const { UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Notification = { findAll: vi.fn(), count: vi.fn(), update: vi.fn() };
mockRequire(require.resolve("../models"), { Notification, User: {}, Article: {}, Comment: {} });

const { listNotifications, markRead } = require("./notifications");

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  Notification.findAll.mockReset();
  Notification.count.mockReset();
  Notification.update.mockReset();
});

describe("listNotifications", () => {
  // AC-131: retrieving notifications requires authentication.
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await listNotifications({ loggedUser: undefined }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-129/AC-131: notifications are scoped to the requesting user
  // (recipientId=loggedUser.id) and returned newest first, alongside the
  // unread count.
  test("with loggedUser -> returns notifications/unreadCount scoped to recipientId", async () => {
    const notifications = [makeInstance({ id: 1, type: "follow" })];
    Notification.findAll.mockResolvedValue(notifications);
    Notification.count.mockResolvedValue(3);
    const res = makeRes();

    await listNotifications({ loggedUser }, res, vi.fn());

    expect(Notification.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { recipientId: 2 },
        order: [["createdAt", "DESC"]],
      }),
    );
    expect(Notification.count).toHaveBeenCalledWith({
      where: { recipientId: 2, read: false },
    });
    expect(res.json).toHaveBeenCalledWith({ notifications, unreadCount: 3 });
  });
});

describe("markRead", () => {
  // AC-131: marking notifications read requires authentication.
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await markRead({ loggedUser: undefined, body: {} }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-130: marking all of the user's notifications read is scoped to
  // recipientId - it can never touch another user's notifications.
  test("all:true -> Notification.update called with where recipientId only", async () => {
    Notification.count.mockResolvedValue(0);
    const res = makeRes();

    await markRead({ loggedUser, body: { all: true } }, res, vi.fn());

    expect(Notification.update).toHaveBeenCalledWith(
      { read: true },
      { where: { recipientId: 2 } },
    );
    expect(res.json).toHaveBeenCalledWith({ unreadCount: 0 });
  });

  // AC-130/AC-131: marking a single notification read is scoped by both id
  // and recipientId - a user cannot mark another user's notification read
  // by guessing its id.
  test("id -> Notification.update called with where id and recipientId", async () => {
    Notification.count.mockResolvedValue(1);
    const res = makeRes();

    await markRead({ loggedUser, body: { id: 7 } }, res, vi.fn());

    expect(Notification.update).toHaveBeenCalledWith(
      { read: true },
      { where: { id: 7, recipientId: 2 } },
    );
    expect(res.json).toHaveBeenCalledWith({ unreadCount: 1 });
  });
});
