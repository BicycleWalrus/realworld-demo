import Markdown from "markdown-to-jsx";
import { Link } from "react-router-dom";
import Avatar from "../Avatar";
import FollowButton from "../FollowButton";

const bioSnippetStyle = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  overflow: "hidden",
};

function UserCard({ bio, followersCount, following, image, updateProfile, username }) {
  return (
    <div className="col-xs-12 col-md-4" style={{ marginBottom: "2rem", textAlign: "center" }}>
      <Link to={`/profile/${username}`} state={{ bio, followersCount, following, image }}>
        <Avatar alt={username} className="user-img" src={image} />
        <h4>{username}</h4>
      </Link>

      {bio && (
        <div style={bioSnippetStyle}>
          <Markdown options={{ forceBlock: true }}>{bio}</Markdown>
        </div>
      )}

      <FollowButton
        followersCount={followersCount}
        following={following}
        handler={updateProfile}
        username={username}
      />
    </div>
  );
}

export default UserCard;
