import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import dateFormatter from "../../helpers/dateFormatter";
import deleteComment from "../../services/deleteComment";
import getComments from "../../services/getComments";
import updateComment from "../../services/updateComment";
import CommentAuthor from "./CommentAuthor";

function CommentList({ triggerUpdate, updateComments }) {
  const [comments, setComments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editBody, setEditBody] = useState("");
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

  const startEditing = (commentId, body) => {
    setEditingId(commentId);
    setEditBody(body);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditBody("");
  };

  const handleEditSubmit = (e, commentId) => {
    e.preventDefault();

    if (editBody.trim() === "") return;

    updateComment({ body: editBody, commentId, headers, slug })
      .then((updated) => {
        cancelEditing();
        updateComments(updated);
      })
      .catch(console.error);
  };

  return comments?.length > 0 ? (
    comments.map(({ author, author: { username }, body, createdAt, id }) => {
      const isAuthor = isAuth && loggedUser.username === username;
      const isEditing = editingId === id;

      return (
        <div className="card" key={id}>
          <div className="card-block">
            {isEditing ? (
              <form onSubmit={(e) => handleEditSubmit(e, id)}>
                <textarea
                  className="form-control"
                  onChange={(e) => setEditBody(e.target.value)}
                  rows="3"
                  value={editBody}
                ></textarea>
              </form>
            ) : (
              <p className="card-text">{body}</p>
            )}
          </div>
          <div className="card-footer">
            <CommentAuthor {...author} />
            <span className="date-posted">{dateFormatter(createdAt)}</span>
            {isAuthor && isEditing && (
              <>
                <button
                  className="btn btn-sm btn-primary pull-xs-right"
                  onClick={(e) => handleEditSubmit(e, id)}
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
          </div>
        </div>
      );
    })
  ) : (
    <div>There are no comments yet...</div>
  );
}

export default CommentList;
