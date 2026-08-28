const { UnauthorizedError } = require("../helper/customErrors");
const { Notification, User, Article, Comment } = require("../models");

//? A user's own notifications (REQ-098), newest first.
const listNotifications = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    // REQ-100: scoped to recipientId=loggedUser.id, so a user can only ever
    // retrieve their own notifications.
    const notifications = await Notification.findAll({
      where: { recipientId: loggedUser.id },
      include: [
        { model: User, as: "actor", attributes: ["username", "image"] },
        { model: Article, attributes: ["slug", "title"] },
        { model: Comment, attributes: ["id", "body"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    const unreadCount = await Notification.count({
      where: { recipientId: loggedUser.id, read: false },
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

//* Mark one (by id) or all of the requesting user's notifications read
// (REQ-099). Scoped to recipientId=loggedUser.id in both branches (REQ-100)
// - a user can only ever mark their own notifications, never another
// user's.
const markRead = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { id, all } = req.body || {};

    if (all) {
      await Notification.update(
        { read: true },
        { where: { recipientId: loggedUser.id } },
      );
    } else if (id) {
      await Notification.update(
        { read: true },
        { where: { id, recipientId: loggedUser.id } },
      );
    }

    const unreadCount = await Notification.count({
      where: { recipientId: loggedUser.id, read: false },
    });

    res.json({ unreadCount });
  } catch (error) {
    next(error);
  }
};

module.exports = { listNotifications, markRead };
