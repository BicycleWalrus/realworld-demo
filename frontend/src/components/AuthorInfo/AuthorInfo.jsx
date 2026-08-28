import Markdown from "markdown-to-jsx";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import dateFormatter from "../../helpers/dateFormatter";
import getProfile from "../../services/getProfile";
import Avatar from "../Avatar";
import FollowButton from "../FollowButton";

function AuthorInfo() {
  const { state } = useLocation();
  const [
    {
      articleCount,
      bio,
      favoritesCount,
      followersCount,
      following,
      github,
      image,
      memberSince,
      twitter,
      website,
    },
    setAuthor,
  ] = useState(state || {});
  const { headers, loggedUser } = useAuth();
  const { username } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // REQ-053..056: router `state` (e.g. from ArticleMeta's Link) never
    // carries the author stats, so a fetch is still needed even when the
    // rest of the state already matches — otherwise stats would never load.
    if (state && state.bio === bio && articleCount !== undefined) return;

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

      {(website || github || twitter) && (
        <ul className="author-links">
          {website && (
            <li>
              <a href={website} target="_blank" rel="noopener noreferrer">
                Website
              </a>
            </li>
          )}
          {github && (
            <li>
              <a href={github} target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
            </li>
          )}
          {twitter && (
            <li>
              <a href={twitter} target="_blank" rel="noopener noreferrer">
                Twitter
              </a>
            </li>
          )}
        </ul>
      )}

      {memberSince !== undefined && (
        <ul className="author-stats">
          <li>{articleCount} articles</li>
          <li>{favoritesCount} favorites</li>
          <li>Member since {dateFormatter(memberSince)}</li>
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
