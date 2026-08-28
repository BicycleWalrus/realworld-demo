const { ForbiddenError, NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Notification = { findAll: vi.fn(), findByPk: vi.fn(), update: vi.fn() };
mockRequire(require.resolve("../models"), { Article: {}, Comment: {}, Notification, User: {} });

const { listNotifications, markRead } = require("./notifications");

const loggedUser = makeInstance({ id: 1, username: "jane" });

beforeEach(() => {
  Notification.findAll.mockReset();
  Notification.findByPk.mockReset();
  Notification.update.mockReset();
});

describe("listNotifications", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await listNotifications({ loggedUser: undefined }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // Only the caller's own notifications are returned, newest first
  // (ordering itself is delegated to the query, asserted via the call).
  test("returns the caller's notifications and unread count", async () => {
    const unread = makeInstance({ id: 1, read: false });
    const read = makeInstance({ id: 2, read: true });
    Notification.findAll.mockResolvedValue([unread, read]);
    const res = makeRes();

    await listNotifications({ loggedUser }, res, vi.fn());

    expect(Notification.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { recipientId: 1 } }),
    );
    expect(res.json).toHaveBeenCalledWith({ notifications: [unread, read], unreadCount: 1 });
  });
});

describe("markRead", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await markRead({ loggedUser: undefined, body: {} }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("marking a nonexistent notification -> NotFoundError", async () => {
    Notification.findByPk.mockResolvedValue(null);
    const next = vi.fn();

    await markRead({ loggedUser, body: { id: 99 } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // A user cannot mark someone else's notification as read.
  test("marking someone else's notification -> ForbiddenError, not marked", async () => {
    const notification = makeInstance(
      { id: 1, recipientId: 2, read: false },
      { save: vi.fn().mockResolvedValue() },
    );
    Notification.findByPk.mockResolvedValue(notification);
    const next = vi.fn();

    await markRead({ loggedUser, body: { id: 1 } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
    expect(notification.save).not.toHaveBeenCalled();
  });

  // Marking one notification by id.
  test("marking one's own notification by id -> marked read", async () => {
    const notification = makeInstance(
      { id: 1, recipientId: 1, read: false },
      { save: vi.fn().mockResolvedValue() },
    );
    Notification.findByPk.mockResolvedValue(notification);
    const res = makeRes();

    await markRead({ loggedUser, body: { id: 1 } }, res, vi.fn());

    expect(notification.read).toBe(true);
    expect(notification.save).toHaveBeenCalled();
  });

  // An explicit `all: true` marks every unread notification of the
  // caller's as read.
  test("all: true -> marks all of the caller's unread notifications read", async () => {
    const res = makeRes();

    await markRead({ loggedUser, body: { all: true } }, res, vi.fn());

    expect(Notification.update).toHaveBeenCalledWith(
      { read: true },
      { where: { recipientId: 1, read: false } },
    );
  });

  // A bare/empty body must not implicitly mark everything as read - that
  // would be a surprising, hard-to-undo side effect of a malformed request.
  test("omitting both id and all -> no-op, nothing marked", async () => {
    const res = makeRes();

    await markRead({ loggedUser, body: {} }, res, vi.fn());

    expect(Notification.update).not.toHaveBeenCalled();
  });
});
