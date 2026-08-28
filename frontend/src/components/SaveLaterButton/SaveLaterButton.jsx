import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import toggleReadLater from "../../services/toggleReadLater";

// Whether an article is already on the viewer's read-later list isn't
// fetched when the article loads (a per-article existence check on every
// page view would add a request the ticket doesn't require) - the button
// reflects the toggle response for the current session, starting from
// "not saved" on a fresh page load.
function SaveLaterButton({ slug }) {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const { headers, isAuth } = useAuth();

  const handleClick = () => {
    if (!isAuth) return alert("You need to login first");

    setLoading(true);

    toggleReadLater({ slug, isSaved, headers })
      .then((article) => setIsSaved(article.isSaved))
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
