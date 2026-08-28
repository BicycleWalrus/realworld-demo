import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import dateFormatter from "../../helpers/dateFormatter";
import useMentionAutocomplete from "../../hooks/useMentionAutocomplete";
import useMentionUsers from "../../hooks/useMentionUsers";
import deleteComment from "../../services/deleteComment";
import getComments from "../../services/getComments";
import postComment from "../../services/postComment";
import updateComment from "../../services/updateComment";
import MentionSuggestions from "../MentionSuggestions";
import MentionText from "../MentionText";
import CommentAuthor from "./CommentAuthor";

function CommentList({ triggerUpdate, updateComments }) {
  const [comments, setComments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState("");
  const [replyToId, setReplyToId] = useState(null);
  const [replyBody, setReplyBody] = useState("");
  const { headers, isAuth, loggedUser } = useAuth();
  const { slug } = useParams();
  // Replies nested by the server still carry usernames mention
  // highlighting should recognize, so mentions resolve over the
  // flattened list. Memoized: useMentionUsers' effect keys on this
  // array's identity, so it must stay stable while comments are
  // unchanged (a fresh array each render would loop the effect).
  const flatComments = useMemo(
    () => comments.flatMap((comment) => [comment, ...(comment.replies ?? [])]),
    [comments],
  );
  const knownUsernames = useMentionUsers(flatComments);
  const { suggestions, updateQuery, applyMention } = useMentionAutocomplete();
  const editCursorRef = useRef(0);

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

  const startEditing = (commentId, body) => {
    setEditingId(commentId);
    setEditBody(body);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditBody("");
  };

  const handleEditSubmit = (commentId) => {
    if (editBody.trim() === "") return;

    updateComment({ body: editBody, commentId, headers, slug })
      .then((updated) => {
        cancelEditing();
        updateComments(updated);
      })
      .catch(console.error);
  };

  const handleEditChange = (e) => {
    setEditBody(e.target.value);
    editCursorRef.current = e.target.selectionStart;
    updateQuery(e.target.value, e.target.selectionStart);
  };

  const handleSelectEditMention = (mentionUsername) => {
    const { text } = applyMention(editBody, editCursorRef.current, mentionUsername);
    setEditBody(text);
  };

  const startReply = (commentId) => {
    setReplyToId(commentId);
    setReplyBody("");
  };

  const cancelReply = () => {
    setReplyToId(null);
    setReplyBody("");
  };

  const handleReplySubmit = (parentId) => {
    if (replyBody.trim() === "") return;

    postComment({ body: replyBody, headers, parentCommentId: parentId, slug })
      .then(updateComments)
      .then(cancelReply)
      .catch(console.error);
  };

  // One card per comment, shared by top-level comments and their nested
  // replies; only top-level comments offer a Reply control, since the
  // server nests replies exactly one level deep (REQ-064).
  const renderCard = (comment, { isReply = false } = {}) => {
    const { author, body, createdAt, id } = comment;
    const username = author.username;
    const isAuthor = isAuth && loggedUser.username === username;
    const isEditing = editingId === id;
    const isReplying = replyToId === id;

    return (
      <div className="card" key={id}>
        <div className="card-block">
          {isEditing ? (
            <>
              <textarea
                className="form-control"
                onChange={handleEditChange}
                rows="3"
                value={editBody}
              ></textarea>
              <MentionSuggestions
                suggestions={suggestions}
                onSelect={handleSelectEditMention}
              />
            </>
          ) : (
            <MentionText body={body} knownUsernames={knownUsernames} />
          )}
        </div>
        <div className="card-footer">
          <CommentAuthor {...author} />
          <span className="date-posted">{dateFormatter(createdAt)}</span>
          {isAuthor && isEditing && (
            <>
              <button
                className="btn btn-sm btn-primary pull-xs-right"
                onClick={() => handleEditSubmit(id)}
              >
                Save
              </button>
              <button
                className="btn btn-sm btn-outline-secondary pull-xs-right"
                onClick={cancelEditing}
              >
                Cancel
              </button>
            </>
          )}
          {isAuthor && !isEditing && (
            <>
              <button
                className="btn btn-sm btn-outline-secondary pull-xs-right"
                onClick={() => handleClick(id)}
              >
                <i className="ion-trash-a"></i>
              </button>
              <button
                aria-label="Edit comment"
                className="btn btn-sm btn-outline-secondary pull-xs-right"
                onClick={() => startEditing(id, body)}
              >
                <i className="ion-edit"></i>
              </button>
            </>
          )}
          {!isReply && isAuth && !isEditing && (
            <button
              aria-label="Reply to comment"
              className="btn btn-sm btn-outline-secondary pull-xs-right"
              onClick={() => startReply(id)}
            >
              <i className="ion-reply"></i>
            </button>
          )}
        </div>
        {!isReply && isReplying && (
          <div className="card-block reply-form">
            <textarea
              className="form-control"
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply..."
              rows="2"
              value={replyBody}
            ></textarea>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => handleReplySubmit(id)}
            >
              Post Reply
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              onClick={cancelReply}
            >
              Cancel Reply
            </button>
          </div>
        )}
        {!isReply && (comment.replies?.length > 0 || isReplying) && (
          <div className="comment-replies">
            {(comment.replies ?? []).map((reply) => renderCard(reply, { isReply: true }))}
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
