import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import toggleReadLater from "../../services/toggleReadLater";

// isSaved reflects the article's actual saved-for-later state (appended
// server-side by appendSavedForLater, same pattern as favorited/
// appendFavorites), not local-only state - so it's already correct on a
// fresh page load, not just after a click in the current session.
function SaveLaterButton({ isSaved, handler, slug }) {
  const [loading, setLoading] = useState(false);
  const { headers, isAuth } = useAuth();

  const handleClick = () => {
    if (!isAuth) return alert("You need to login first");

    setLoading(true);

    toggleReadLater({ slug, isSaved, headers })
      .then(handler)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <button
      className={`btn btn-sm btn-outline-secondary ${isSaved ? "active" : ""}`}
      disabled={loading}
      onClick={handleClick}
    >
      <i className="ion-bookmark"></i> {isSaved ? "Saved" : "Read Later"}
    </button>
  );
}

export default SaveLaterButton;
