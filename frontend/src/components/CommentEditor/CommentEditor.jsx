import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import postComment from "../../services/postComment";
import searchUsers from "../../services/searchUsers";
import Avatar from "../Avatar";

// Matches an in-progress @mention ending at the cursor, e.g. "hi @al" -> "al".
const ACTIVE_MENTION_PATTERN = /@([a-zA-Z0-9_]+)$/;

function CommentEditor({ updateComments }) {
  const [{ body }, setForm] = useState({ body: "" });
  const [suggestions, setSuggestions] = useState([]);
  const textareaRef = useRef(null);
  const { headers, isAuth, loggedUser } = useAuth();
  const { username, image } = loggedUser || {};
  const { slug } = useParams();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (body.trim() === "") return;

    postComment({ body, headers, slug })
      .then(updateComments)
      .then(setForm({ body: "" }))
      .catch(console.error);
  };

  const handleChange = (e) => {
    setForm({ body: e.target.value });
  };

  useEffect(() => {
    const cursor = textareaRef.current?.selectionStart ?? body.length;
    const activeMention = body.slice(0, cursor).match(ACTIVE_MENTION_PATTERN)?.[1];

    if (!activeMention) return setSuggestions([]);

    searchUsers({ q: activeMention })
      .then((users) => setSuggestions(users || []))
      .catch(() => setSuggestions([]));
  }, [body]);

  const handleSuggestionClick = (suggestedUsername) => {
    const cursor = textareaRef.current?.selectionStart ?? body.length;
    const upToCursor = body.slice(0, cursor).replace(ACTIVE_MENTION_PATTERN, `@${suggestedUsername} `);

    setForm({ body: upToCursor + body.slice(cursor) });
    setSuggestions([]);
  };

  return isAuth ? (
    <form className="card comment-form" onSubmit={handleSubmit}>
      <div className="card-block">
        <textarea
          className="form-control"
          onChange={handleChange}
          placeholder="Write a comment..."
          ref={textareaRef}
          rows="3"
          value={body}
        ></textarea>
        {suggestions.length > 0 && (
          <div className="dropdown-menu mention-suggestions" style={{ display: "block" }}>
            {suggestions.map(({ username: suggestedUsername }) => (
              <button
                className="dropdown-item"
                key={suggestedUsername}
                onClick={() => handleSuggestionClick(suggestedUsername)}
                type="button"
              >
                @{suggestedUsername}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card-footer">
        <Avatar alt={username} className="comment-author-img" src={image} />
        <button className="btn btn-sm btn-primary">Post Comment</button>
      </div>
    </form>
  ) : (
    <span>
      <Link to="/login">Sign in</Link> or <Link to="/register">Sign up</Link> to
      add comments on this article.
    </span>
  );
}

export default CommentEditor;
