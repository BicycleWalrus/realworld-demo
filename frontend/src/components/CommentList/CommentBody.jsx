import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import searchUsers from "../../services/searchUsers";

const MENTION_PATTERN = /@([a-zA-Z0-9_]+)/g;

function CommentBody({ body }) {
  const [linkedUsernames, setLinkedUsernames] = useState([]);

  useEffect(() => {
    const mentions = [...new Set([...body.matchAll(MENTION_PATTERN)].map((match) => match[1]))];
    if (mentions.length === 0) return setLinkedUsernames([]);

    Promise.all(
      mentions.map((mention) =>
        searchUsers({ q: mention }).then((matches) =>
          matches?.some((user) => user.username.toLowerCase() === mention.toLowerCase())
            ? mention
            : null,
        ),
      ),
    )
      .then((resolved) => setLinkedUsernames(resolved.filter(Boolean)))
      .catch(console.error);
  }, [body]);

  const parts = body.split(MENTION_PATTERN);

  return (
    <p className="card-text">
      {parts.map((part, index) =>
        index % 2 === 0 ? (
          part
        ) : linkedUsernames.some((username) => username.toLowerCase() === part.toLowerCase()) ? (
          <Link key={index} to={`/profile/${part}`}>
            @{part}
          </Link>
        ) : (
          `@${part}`
        ),
      )}
    </p>
  );
}

export default CommentBody;
