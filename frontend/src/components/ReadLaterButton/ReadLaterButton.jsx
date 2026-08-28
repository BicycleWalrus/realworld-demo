import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import toggleReadLater from "../../services/toggleReadLater";

// REQ-086: save/unsave an article to the user's private read-later list.
// Mirrors FavButton's shape/behavior, but toggles the separate read-later
// join rather than Favorites, and never touches favoritesCount.
function ReadLaterButton({ readLater, slug, handler }) {
  const [loading, setLoading] = useState(false);
  const { headers, isAuth } = useAuth();

  const buttonStyle = readLater ? "active" : "";
  const buttonText = readLater ? "Saved" : "Read Later";

  const handleClick = () => {
    if (!isAuth) return alert("You need to login first");

    setLoading(true);

    toggleReadLater({ slug, saved: readLater, headers })
      .then(handler)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <button
      className={`btn btn-sm btn-outline-secondary ${buttonStyle}`}
      disabled={loading}
      onClick={handleClick}
    >
      <i className="ion-bookmark"></i> {buttonText}
    </button>
  );
}

export default ReadLaterButton;
