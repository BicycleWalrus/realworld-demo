import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import setReaction, { removeReaction } from "../../services/setReaction";

// REQ-094/REQ-095: one reaction per user per article, from a fixed set.
// Independent of FavButton/Favorites - a separate concept entirely, shown
// alongside it.
const REACTION_TYPES = [
  { type: "like", label: "Like" },
  { type: "insightful", label: "Insightful" },
  { type: "celebrate", label: "Celebrate" },
];

function Reactions({ reactionCounts, reaction, slug, handler }) {
  const [loading, setLoading] = useState(false);
  const { headers, isAuth } = useAuth();

  const counts = reactionCounts || { like: 0, insightful: 0, celebrate: 0 };

  const handleClick = (type) => {
    if (!isAuth) return alert("You need to login first");

    setLoading(true);

    const request =
      reaction === type
        ? removeReaction({ slug, headers })
        : setReaction({ slug, type, headers });

    request.then(handler).catch(console.error).finally(() => setLoading(false));
  };

  return (
    <>
      {REACTION_TYPES.map(({ type, label }) => (
        <button
          key={type}
          className={`btn btn-sm btn-outline-primary ${reaction === type ? "active" : ""}`}
          disabled={loading}
          onClick={() => handleClick(type)}
        >
          {label}
          <span className="counter"> ( {counts[type] ?? 0} )</span>
        </button>
      ))}
    </>
  );
}

export default Reactions;
