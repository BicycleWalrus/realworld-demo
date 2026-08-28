import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import removeArticleReaction from "../../services/removeArticleReaction";
import setArticleReaction from "../../services/setArticleReaction";

// The fixed reaction set (REQ-066), mirrored from the backend's
// REACTION_TYPES. Reactions are independent of favoriting.
const REACTIONS = [
  { type: "like", emoji: "❤️", label: "Like" },
  { type: "insightful", emoji: "💡", label: "Insightful" },
  { type: "celebrate", emoji: "🎉", label: "Celebrate" },
];

function ReactionBar({ article, setArticle }) {
  const [loading, setLoading] = useState(false);
  const { headers, isAuth } = useAuth();
  const { reactions = {}, viewerReaction, slug } = article || {};

  const handleClick = (type) => {
    if (!isAuth) return alert("You need to login first");
    if (loading) return;

    setLoading(true);

    // Clicking the active reaction removes it; clicking any other sets
    // (or changes to) that one.
    const request =
      viewerReaction === type
        ? removeArticleReaction({ headers, slug })
        : setArticleReaction({ headers, slug, type });

    request
      .then(setArticle)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <span className="reaction-bar">
      {REACTIONS.map(({ type, emoji, label }) => (
        <button
          aria-label={`${label} reaction`}
          aria-pressed={viewerReaction === type}
          className={`btn btn-sm btn-outline-secondary ${viewerReaction === type ? "active" : ""}`}
          disabled={loading}
          key={type}
          onClick={() => handleClick(type)}
        >
          {emoji} {label} <span className="counter">( {reactions[type] ?? 0} )</span>
        </button>
      ))}
    </span>
  );
}

export default ReactionBar;
