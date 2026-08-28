import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import useMentionAutocomplete from "../../hooks/useMentionAutocomplete";
import postComment from "../../services/postComment";
import Avatar from "../Avatar";
import MentionSuggestions from "../MentionSuggestions";

function CommentEditor({ updateComments }) {
  const [{ body }, setForm] = useState({ body: "" });
  const { headers, isAuth, loggedUser } = useAuth();
  const { username, image } = loggedUser || {};
  const { slug } = useParams();
  const { suggestions, updateQuery, applyMention } = useMentionAutocomplete();
  const cursorRef = useRef(0);

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
    cursorRef.current = e.target.selectionStart;
    updateQuery(e.target.value, e.target.selectionStart);
  };

  const handleSelectMention = (mentionUsername) => {
    const { text } = applyMention(body, cursorRef.current, mentionUsername);
    setForm({ body: text });
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
        <MentionSuggestions suggestions={suggestions} onSelect={handleSelectMention} />
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
