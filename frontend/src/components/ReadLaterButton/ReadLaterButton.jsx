import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import toggleReadLater from "../../services/toggleReadLater";

function ReadLaterButton({ handler, readLater, slug }) {
  const [loading, setLoading] = useState(false);
  const { headers, isAuth } = useAuth();

  const handleClick = () => {
    if (!isAuth) return alert("You need to login first");

    setLoading(true);

    toggleReadLater({ slug, readLater, headers })
      .then((article) => handler(Boolean(article?.readLater)))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <button
      className={`btn btn-sm btn-outline-secondary ${readLater ? "active" : ""}`}
      disabled={loading}
      onClick={handleClick}
    >
      <i className="ion-bookmark"></i> {readLater ? " Saved for Later" : " Read Later"}
    </button>
  );
}

export default ReadLaterButton;
