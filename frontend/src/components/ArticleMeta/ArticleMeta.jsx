import { Link } from "react-router-dom";
import dateFormatter from "../../helpers/dateFormatter";
import readingTime from "../../helpers/readingTime";
import Avatar from "../Avatar";

function ArticleMeta({ author, body, children, createdAt }) {
  const { bio, followersCount, following, github, image, twitter, username, website } =
    author || {};

  return (
    <div className="article-meta">
      <Link
        state={{ bio, followersCount, following, github, image, twitter, website }}
        to={`/profile/${username}`}
      >
        <Avatar alt={username} src={image} />
      </Link>
      <div className="info">
        <Link
          className="author"
          state={{ bio, followersCount, following, github, image, twitter, website }}
          to={`/profile/${username}`}
        >
          {username}
        </Link>
        <span className="date">{dateFormatter(createdAt)}</span>
        <span className="date reading-time">{readingTime(body)}</span>
      </div>
      {children}
    </div>
  );
}

export default ArticleMeta;
