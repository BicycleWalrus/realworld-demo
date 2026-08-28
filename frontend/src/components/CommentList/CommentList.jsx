import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import dateFormatter from "../../helpers/dateFormatter";
import deleteComment from "../../services/deleteComment";
import editComment from "../../services/editComment";
import getComments from "../../services/getComments";
import CommentAuthor from "./CommentAuthor";

function CommentList({ triggerUpdate, updateComments }) {
  const [comments, setComments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
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
    setDraft(body);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraft("");
  };

  const saveEditing = (commentId) => {
    if (draft.trim() === "") return;

    editComment({ body: draft, commentId, headers, slug })
      .then(updateComments)
      .catch(console.error);
    setEditingId(null);
    setDraft("");
  };

  return comments?.length > 0 ? (
    comments.map(({ author, author: { username }, body, createdAt, id }) => {
      const canEdit = isAuth && loggedUser.username === username;
      const isEditing = editingId === id;

      return (
        <div className="card" key={id}>
          <div className="card-block">
            {isEditing ? (
              <textarea
                className="form-control"
                onChange={(e) => setDraft(e.target.value)}
                value={draft}
              />
            ) : (
              <p className="card-text">{body}</p>
            )}
          </div>
          <div className="card-footer">
            <CommentAuthor {...author} />
            <span className="date-posted">{dateFormatter(createdAt)}</span>
            {canEdit && isEditing && (
              <>
                <button
                  className="btn btn-sm btn-outline-secondary pull-xs-right"
                  onClick={() => saveEditing(id)}
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
            {canEdit && !isEditing && (
              <>
                <button
                  className="btn btn-sm btn-outline-secondary pull-xs-right"
                  onClick={() => handleClick(id)}
                >
                  <i className="ion-trash-a"></i>
                </button>
                <button
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
