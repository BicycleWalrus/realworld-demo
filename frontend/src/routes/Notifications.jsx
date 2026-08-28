import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ContainerRow from "../components/ContainerRow";
import { useAuth } from "../context/AuthContext";
import getNotifications from "../services/getNotifications";
import markNotificationsRead from "../services/markNotificationsRead";

// REQ-097/REQ-098/REQ-099: the authenticated user's own notifications
// center - raised as a side effect of another user following them,
// commenting on one of their articles, or favoriting one of their
// articles. Private to the recipient (REQ-100), so an unauthenticated
// visitor sees a sign-in prompt instead, mirroring ReadLater.
function actionText(type) {
  switch (type) {
    case "follow":
      return "followed you";
    case "comment":
      return "commented on your article";
    case "favorite":
      return "favorited your article";
    default:
      return "did something";
  }
}

function Notifications() {
  const { headers, isAuth } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuth) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getNotifications({ headers })
      .then((data) => {
        setNotifications(data?.notifications ?? []);
        setUnreadCount(data?.unreadCount ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [headers, isAuth]);

  const handleMarkAllRead = () => {
    markNotificationsRead({ headers, all: true })
      .then((data) => {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(data?.unreadCount ?? 0);
      })
      .catch(console.error);
  };

  const handleMarkRead = (id) => {
    markNotificationsRead({ headers, id })
      .then((data) => {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        setUnreadCount(data?.unreadCount ?? 0);
      })
      .catch(console.error);
  };

  if (!isAuth) {
    return (
      <div className="notifications-page">
        <ContainerRow type="page">
          <div className="col-md-10 offset-md-1">
            <h1>Notifications</h1>
            <p>
              <Link to="/login">Sign in</Link> to see your notifications.
            </p>
          </div>
        </ContainerRow>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <ContainerRow type="page">
        <div className="col-md-10 offset-md-1">
          <h1>Notifications</h1>

          {unreadCount > 0 && (
            <button
              className="btn btn-sm btn-outline-primary"
              type="button"
              onClick={handleMarkAllRead}
            >
              Mark all as read
            </button>
          )}

          {loading ? (
            <div className="article-preview">
              <em>Loading your notifications...</em>
            </div>
          ) : notifications.length > 0 ? (
            <ul className="notifications-list">
              {notifications.map((notification) => (
                <li
                  key={notification.id}
                  className={`notification-item ${notification.read ? "" : "notification-unread"}`}
                >
                  <Link to={`/profile/${notification.actor?.username}`}>
                    {notification.actor?.username ?? "Someone"}
                  </Link>{" "}
                  {actionText(notification.type)}
                  {notification.Article && (
                    <>
                      {" "}
                      <Link to={`/article/${notification.Article.slug}`}>
                        {notification.Article.title}
                      </Link>
                    </>
                  )}
                  {!notification.read && (
                    <button
                      className="btn btn-sm btn-link"
                      type="button"
                      onClick={() => handleMarkRead(notification.id)}
                    >
                      Mark as read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="article-preview">
              You don&apos;t have any notifications yet.
            </div>
          )}
        </div>
      </ContainerRow>
    </div>
  );
}

export default Notifications;
