import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import dateFormatter from "../../helpers/dateFormatter";
import deleteComment from "../../services/deleteComment";
import getComments from "../../services/getComments";
import postComment from "../../services/postComment";
import updateComment from "../../services/updateComment";
import CommentAuthor from "./CommentAuthor";

// REQ-080/REQ-081: split a comment body on `@word` tokens and render each
// one that appears in `mentions` (the valid, server-resolved usernames for
// this comment - see comments.js allComments) as a link to that user's
// profile; any other `@word` (no matching user) is left as plain text.
function renderBody(body, mentions) {
  return body.split(/(@\w+)/g).map((part, index) => {
    const match = part.match(/^@(\w+)$/);
    const username = match?.[1];

    return username && mentions.includes(username) ? (
      <Link className="mention" key={index} to={`/profile/${username}`}>
        @{username}
      </Link>
    ) : (
      part
    );
  });
}

function CommentList({ triggerUpdate, updateComments }) {
  const [comments, setComments] = useState([]);
  // REQ-068: which comment (if any) is currently in the author's inline
  // edit view, and the draft body being edited.
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState("");
  // REQ-082: which top-level comment (if any) has its inline reply form
  // open, and the draft body being typed into it. Only top-level comments
  // can have an open reply form - replies themselves are not repliable
  // (one level of nesting only).
  const [replyingId, setReplyingId] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const { headers, isAuth, loggedUser } = useAuth();
  const { slug } = useParams();

  useEffect(() => {
    getComments({ slug }).then(setComments).catch(console.error);
  }, [slug, triggerUpdate]);

  const handleClick = (commentId) => {
    if (!isAuth) alert("You need to login first");

    const confirmation = window.confirm("Want to delete the comment?");
    if (!confirmation) return;

    deleteComment({ commentId, headers, slug })
      .then(updateComments)
      .catch(console.error);
  };

  const handleEditClick = (commentId, body) => {
    setEditingId(commentId);
    setEditBody(body);
  };

  const handleEditChange = (e) => {
    setEditBody(e.target.value);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // REQ-066: a non-empty body is required to save an edit, mirroring
  // CommentEditor's own client-side block on whitespace-only bodies.
  const handleSaveEdit = (commentId) => {
    if (editBody.trim() === "") return;

    updateComment({ body: editBody, commentId, headers, slug })
      .then((result) => {
        setEditingId(null);
        // REQ-067: refresh via updateComments -> triggerUpdate so the
        // persisted body is what's shown, not just local state.
        updateComments(result);
      })
      .catch(console.error);
  };

  // REQ-082: toggles the inline reply form for a top-level comment.
  const handleReplyClick = (commentId) => {
    setReplyingId((current) => (current === commentId ? null : commentId));
    setReplyBody("");
  };

  const handleReplyChange = (e) => {
    setReplyBody(e.target.value);
  };

  const handleCancelReply = () => {
    setReplyingId(null);
  };

  // REQ-082: a non-empty body is required to post a reply, mirroring
  // CommentEditor's own client-side block on whitespace-only bodies
  // (REQ-020-style) and CommentList's own edit-save guard above.
  const handleSubmitReply = (parentId) => {
    if (replyBody.trim() === "") return;

    postComment({ body: replyBody, headers, parentId, slug })
      .then((result) => {
        setReplyingId(null);
        setReplyBody("");
        // REQ-083: refresh via updateComments -> triggerUpdate so the new
        // reply shows up nested under its parent from the server.
        updateComments(result);
      })
      .catch(console.error);
  };

  // Renders a single comment card. Used for both top-level comments and
  // their nested replies (REQ-083); `isReply` suppresses the Reply control
  // and the nested replies block, since only one level of nesting is
  // supported (REQ-082) - a reply cannot itself be replied to.
  const renderCard = (comment, { isReply = false } = {}) => {
    const {
      author,
      author: { username },
      body,
      createdAt,
      id,
      mentions = [],
      replies = [],
    } = comment;
    const isAuthor = isAuth && loggedUser.username === username;
    const isEditing = editingId === id;

    return (
      <div className="card" key={id}>
        <div className="card-block">
          {isEditing ? (
            <textarea
              className="form-control"
              onChange={handleEditChange}
              rows="3"
              value={editBody}
            ></textarea>
          ) : (
            <p className="card-text">{renderBody(body, mentions)}</p>
          )}
        </div>
        <div className="card-footer">
          <CommentAuthor {...author} />
          <span className="date-posted">{dateFormatter(createdAt)}</span>
          {isEditing ? (
            <>
              <button
                className="btn btn-sm btn-primary pull-xs-right"
                onClick={() => handleSaveEdit(id)}
              >
                Save
              </button>
              <button
                className="btn btn-sm btn-outline-secondary pull-xs-right"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              {isAuthor && (
                <>
                  <button
                    className="btn btn-sm btn-outline-secondary pull-xs-right"
                    onClick={() => handleEditClick(id, body)}
                  >
                    <i className="ion-edit"></i>
                  </button>
                  <button
                    className="btn btn-sm btn-outline-secondary pull-xs-right"
                    onClick={() => handleClick(id)}
                  >
                    <i className="ion-trash-a"></i>
                  </button>
                </>
              )}
              {!isReply && isAuth && (
                <button
                  className="btn btn-sm btn-outline-secondary pull-xs-right"
                  onClick={() => handleReplyClick(id)}
                >
                  Reply
                </button>
              )}
            </>
          )}
        </div>
        {!isReply && replyingId === id && (
          <div className="card-block reply-form">
            <textarea
              className="form-control"
              onChange={handleReplyChange}
              placeholder="Write a reply..."
              rows="2"
              value={replyBody}
            ></textarea>
            <button
              className="btn btn-sm btn-primary pull-xs-right"
              onClick={() => handleSubmitReply(id)}
            >
              Post Reply
            </button>
            <button
              className="btn btn-sm btn-outline-secondary pull-xs-right"
              onClick={handleCancelReply}
            >
              Cancel
            </button>
          </div>
        )}
        {!isReply && replies.length > 0 && (
          <div className="comment-replies">
            {replies.map((reply) => renderCard(reply, { isReply: true }))}
          </div>
        )}
      </div>
    );
  };

  return comments?.length > 0 ? (
    comments.map((comment) => renderCard(comment))
  ) : (
    <div>There are no comments yet...</div>
  );
}

export default CommentList;
