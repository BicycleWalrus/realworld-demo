import Markdown from "markdown-to-jsx";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import isSafeUrl from "../../helpers/isSafeUrl";
import getProfile from "../../services/getProfile";
import Avatar from "../Avatar";
import FollowButton from "../FollowButton";

function AuthorInfo() {
  const { state } = useLocation();
  const [
    { bio, followersCount, following, github, image, twitter, website },
    setAuthor,
  ] = useState(state || {});
  const { headers, loggedUser } = useAuth();
  const { username } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (state && state.bio === bio) return;

    getProfile({ headers, username })
      .then(setAuthor)
      .catch((error) => {
        console.error(error);
        navigate("/not-found", { replace: true });
      });
  }, [username, headers, state, navigate]);

  const followHandler = ({ followersCount, following }) => {
    setAuthor((prev) => ({ ...prev, followersCount, following }));
  };

  return (
    <div className="col-xs-12 col-md-10 offset-md-1">
      <Avatar alt={username} className="user-img" src={image} />
      <h4>{username}</h4>

      {bio && <Markdown options={{ forceBlock: true }}>{bio}</Markdown>}

      {[website, github, twitter].some(isSafeUrl) && (
        <ul className="social-links">
          {isSafeUrl(website) && (
            <li>
              <a href={website} target="_blank" rel="noreferrer">
                <i className="ion-earth"></i> Website
              </a>
            </li>
          )}
          {isSafeUrl(github) && (
            <li>
              <a href={github} target="_blank" rel="noreferrer">
                <i className="ion-social-github"></i> GitHub
              </a>
            </li>
          )}
          {isSafeUrl(twitter) && (
            <li>
              <a href={twitter} target="_blank" rel="noreferrer">
                <i className="ion-social-twitter"></i> Twitter
              </a>
            </li>
          )}
        </ul>
      )}

      {username === loggedUser.username ? (
        <Link
          className="btn btn-sm btn-outline-secondary action-btn"
          to="/settings"
        >
          <i className="ion-gear-a"></i> Edit Profile Settings
        </Link>
      ) : (
        <FollowButton
          followersCount={followersCount}
          following={following}
          handler={followHandler}
          username={username}
        />
      )}
    </div>
  );
}

export default AuthorInfo;
