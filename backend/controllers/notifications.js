const { UnauthorizedError, NotFoundError, ForbiddenError } = require("../helper/customErrors");
const { Article, Comment, Notification, User } = require("../models");

//? Current user's notifications
const listNotifications = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const notifications = await Notification.findAll({
      where: { recipientId: loggedUser.id },
      include: [
        { model: User, as: "actor", attributes: { exclude: ["email"] } },
        { model: Article, attributes: ["slug", "title"] },
        { model: Comment, attributes: ["id", "body"] },
      ],
      order: [["createdAt", "DESC"]],
    });

    const unreadCount = notifications.filter((n) => !n.read).length;

    res.json({ notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

//* Mark one (or all unread) notifications as read
const markRead = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { all, id } = req.body;

    if (id) {
      const notification = await Notification.findByPk(id);
      if (!notification) throw new NotFoundError("Notification");

      if (notification.recipientId !== loggedUser.id) {
        throw new ForbiddenError("notification");
      }

      notification.read = true;
      await notification.save();

      return res.json({ notification });
    }

    if (!all) {
      return res.json({ message: { body: ["No notification specified"] } });
    }

    await Notification.update(
      { read: true },
      { where: { recipientId: loggedUser.id, read: false } },
    );

    res.json({ message: { body: ["Notifications marked as read"] } });
  } catch (error) {
    next(error);
  }
};

module.exports = { listNotifications, markRead };
