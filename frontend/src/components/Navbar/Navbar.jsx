import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import getNotifications from "../../services/getNotifications";
import NavItem from "../NavItem";
import SourceCodeLink from "../SourceCodeLink";
import ThemeToggle from "../ThemeToggle";
import DropdownMenu from "./DropdownMenu";

function Navbar() {
  const { headers, isAuth } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // REQ-099: fetch the unread notification count once for an at-a-glance
  // badge next to the nav link - not polled, refreshed on next full page
  // load / navigation to the Navbar-mounting tree.
  useEffect(() => {
    if (!isAuth || !headers) {
      setUnreadCount(0);
      return;
    }

    getNotifications({ headers })
      .then((data) => setUnreadCount(data?.unreadCount ?? 0))
      .catch(console.error);
  }, [headers, isAuth]);

  return (
    <nav className="navbar navbar-light">
      <div className="container">
        <Link className="navbar-brand" to="/">
          conduit
        </Link>

        <SourceCodeLink left />

        <ul className="nav navbar-nav pull-xs-right">
          <NavItem text="Home" icon="ion-compose" url="/" />
          <NavItem text="Directory" icon="ion-person-stalker" url="/directory" />

          {isAuth && (
            <>
              <NavItem text="New Article" icon="ion-compose" url="/editor" />
              <NavItem text="Read Later" icon="ion-bookmark" url="/read-later" />
              <NavItem
                text={
                  unreadCount > 0 ? (
                    <>
                      Notifications{" "}
                      <span className="badge badge-pill badge-primary notification-badge">
                        {unreadCount}
                      </span>
                    </>
                  ) : (
                    "Notifications"
                  )
                }
                icon="ion-android-notifications"
                url="/notifications"
              />
              <DropdownMenu />
            </>
          )}

          {!isAuth && (
            <>
              <NavItem text="Login" icon="ion-log-in" url="/login" />
              <NavItem text="Sign up" url="/register" />
            </>
          )}

          <ThemeToggle />
        </ul>
      </div>
    </nav>
  );
}
export default Navbar;
