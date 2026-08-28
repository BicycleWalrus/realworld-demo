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
    { articlesCount, bio, favoritesCount, following, followersCount, image, memberSince },
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

  // Profile stats (article count, total favorites, member-since) are never
  // part of the navigation state above — that state only ever carries
  // bio/avatar/follow status (REQ-043) — so they're fetched independently,
  // regardless of whether the effect above skipped its own fetch.
  useEffect(() => {
    getProfile({ headers, username })
      .then(({ articlesCount, favoritesCount, memberSince }) =>
        setAuthor((prev) => ({ ...prev, articlesCount, favoritesCount, memberSince })),
      )
      .catch(console.error);
  }, [username, headers]);

  const followHandler = ({ followersCount, following }) => {
    setAuthor((prev) => ({ ...prev, followersCount, following }));
  };

  return (
    <div className="col-xs-12 col-md-10 offset-md-1">
      <Avatar alt={username} className="user-img" src={image} />
      <h4>{username}</h4>

      {bio && <Markdown options={{ forceBlock: true }}>{bio}</Markdown>}

      <ul className="profile-stats">
        <li>{articlesCount ?? 0} Articles</li>
        <li>{favoritesCount ?? 0} Favorites</li>
        {memberSince && <li>Member since {dateFormatter(memberSince)}</li>}
      </ul>

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
