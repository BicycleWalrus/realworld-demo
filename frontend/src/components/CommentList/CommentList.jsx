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
  // REQ-068: which comment (if any) is currently in the author's inline
  // edit view, and the draft body being edited.
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

  return comments?.length > 0 ? (
    comments.map(({ author, author: { username }, body, createdAt, id }) => {
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
              <p className="card-text">{body}</p>
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
              isAuthor && (
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
              )
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
