import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import dateFormatter from "../../helpers/dateFormatter";
import deleteComment from "../../services/deleteComment";
import getComments from "../../services/getComments";
import postComment from "../../services/postComment";
import CommentAuthor from "./CommentAuthor";

function CommentList({ triggerUpdate, updateComments }) {
  const [comments, setComments] = useState([]);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyDraft, setReplyDraft] = useState("");
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

  const startReply = (commentId) => {
    setReplyingTo(commentId);
    setReplyDraft("");
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setReplyDraft("");
  };

  const submitReply = (parentId) => {
    if (replyDraft.trim() === "") return;

    postComment({ body: replyDraft, headers, parentId, slug })
      .then(updateComments)
      .catch(console.error);

    setReplyingTo(null);
    setReplyDraft("");
  };

  const renderComment = (comment, { isReply = false } = {}) => {
    const { author, author: { username }, body, createdAt, id } = comment;
    const canDelete = isAuth && loggedUser.username === username;

    return (
      <div className="card" key={id}>
        <div className="card-block">
          <p className="card-text">{body}</p>
        </div>
        <div className="card-footer">
          <CommentAuthor {...author} />
          <span className="date-posted">{dateFormatter(createdAt)}</span>
          {!isReply && isAuth && (
            <button
              className="btn btn-sm btn-outline-secondary pull-xs-right"
              onClick={() => startReply(id)}
            >
              Reply
            </button>
          )}
          {canDelete && (
            <button
              className="btn btn-sm btn-outline-secondary pull-xs-right"
              onClick={() => handleClick(id)}
            >
              <i className="ion-trash-a"></i>
            </button>
          )}
        </div>

        {replyingTo === id && (
          <div className="card-block reply-form">
            <textarea
              className="form-control"
              onChange={(e) => setReplyDraft(e.target.value)}
              placeholder="Write a reply..."
              rows="2"
              value={replyDraft}
            ></textarea>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => submitReply(id)}
            >
              Post Reply
            </button>
            <button className="btn btn-sm btn-outline-secondary" onClick={cancelReply}>
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  return comments?.length > 0 ? (
    comments.map((comment) => (
      <div key={comment.id}>
        {renderComment(comment)}

        {comment.replies?.length > 0 && (
          <div className="comment-replies" style={{ marginLeft: "2rem" }}>
            {comment.replies.map((reply) => renderComment(reply, { isReply: true }))}
          </div>
        )}
      </div>
    ))
  ) : (
    <div>There are no comments yet...</div>
  );
}

export default CommentList;
