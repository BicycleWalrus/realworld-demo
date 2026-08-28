import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import getNotifications from "../../services/getNotifications";
import markNotificationsRead from "../../services/markNotificationsRead";

function describeNotification({ actor, article, type }) {
  const username = actor?.username || "Someone";

  switch (type) {
    case "follow":
      return `${username} followed you`;
    case "comment":
      return `${username} commented on your article "${article?.title || ""}"`;
    case "favorite":
      return `${username} favorited your article "${article?.title || ""}"`;
    default:
      return `${username} did something`;
  }
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { headers } = useAuth();

  const fetchNotifications = () => {
    getNotifications({ headers })
      .then(({ notifications, unreadCount }) => {
        setNotifications(notifications);
        setUnreadCount(unreadCount);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchNotifications();
  }, [headers]);

  const toggleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) fetchNotifications();
  };

  const markOneRead = (id) => {
    markNotificationsRead({ headers, id })
      .then(fetchNotifications)
      .catch(console.error);
  };

  const markAllRead = () => {
    markNotificationsRead({ headers })
      .then(fetchNotifications)
      .catch(console.error);
  };

  return (
    <li className="nav-item dropdown">
      <div className="nav-link dropdown-toggle cursor-pointer" onClick={toggleOpen}>
        <i className="ion-ios-bell"></i>
        {unreadCount > 0 && <span className="counter"> ( {unreadCount} )</span>}
      </div>

      <div className="dropdown-menu" style={{ display: open ? "block" : "none" }} onMouseLeave={toggleOpen}>
        {notifications.length > 0 ? (
          <>
            {notifications.map((notification) => (
              <Link
                className={`dropdown-item ${notification.read ? "" : "active"}`}
                key={notification.id}
                onClick={() => markOneRead(notification.id)}
                to={notification.article ? `/article/${notification.article.slug}` : "#"}
              >
                {describeNotification(notification)}
              </Link>
            ))}
            <div className="dropdown-divider"></div>
            <Link className="dropdown-item" onClick={markAllRead} to="#">
              Mark all as read
            </Link>
          </>
        ) : (
          <span className="dropdown-item">No notifications yet</span>
        )}
      </div>
    </li>
  );
}

export default NotificationBell;
