import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import toggleReadLater from "../../services/toggleReadLater";

function ReadLaterButton({ slug }) {
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const { headers, isAuth } = useAuth();

  const handleClick = () => {
    if (!isAuth) return alert("You need to login first");

    setLoading(true);

    toggleReadLater({ headers, readLater: saved, slug })
      .then(() => setSaved((prev) => !prev))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <button
      className={`btn btn-sm btn-outline-secondary ${saved ? "active" : ""}`}
      disabled={loading}
      onClick={handleClick}
    >
      <i className="ion-bookmark"></i> {saved ? "Saved" : "Read Later"}
    </button>
  );
}

export default ReadLaterButton;
