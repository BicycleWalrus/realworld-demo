import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import getProfiles from "../../services/getProfiles";
import postComment from "../../services/postComment";
import Avatar from "../Avatar";

// REQ-079: MVP scope - suggestions are only offered for a mention token
// being typed at the very end of the textarea value (a trailing `@\w*`).
// This avoids caret-position tracking; a mention typed earlier in the body
// and then followed by more text is not re-offered suggestions.
const TRAILING_MENTION = /@(\w+)$/;
const SUGGESTION_LIMIT = 5;

function CommentEditor({ updateComments }) {
  const [{ body }, setForm] = useState({ body: "" });
  const [suggestions, setSuggestions] = useState([]);
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
    const newBody = e.target.value;
    setForm({ body: newBody });

    const match = newBody.match(TRAILING_MENTION);
    if (match) {
      getProfiles({ limit: SUGGESTION_LIMIT, username: match[1] })
        .then((result) => setSuggestions(result?.profiles?.map((p) => p.username) || []))
        .catch(console.error);
    } else {
      setSuggestions([]);
    }
  };

  const handleSuggestionClick = (suggestedUsername) => {
    const newBody = body.replace(TRAILING_MENTION, `@${suggestedUsername} `);
    setForm({ body: newBody });
    setSuggestions([]);
  };

  return isAuth ? (
    <form className="card comment-form" onSubmit={handleSubmit}>
      <div className="card-block">
        <textarea
          className="form-control"
          onChange={handleChange}
          placeholder="Write a comment..."
          rows="3"
          value={body}
        ></textarea>
        {suggestions.length > 0 && (
          <ul className="mention-suggestions">
            {suggestions.map((suggestedUsername) => (
              <li key={suggestedUsername}>
                <button
                  className="mention-suggestion"
                  onClick={() => handleSuggestionClick(suggestedUsername)}
                  type="button"
                >
                  @{suggestedUsername}
                </button>
              </li>
            ))}
          </ul>
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
