import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import toggleReaction from "../../services/toggleReaction";

// Fixed, documented set of reaction types - mirrors backend/helper/
// helpers.js's REACTION_TYPES.
const REACTIONS = [
  { type: "like", icon: "ion-thumbsup", label: "Like" },
  { type: "insightful", icon: "ion-lightbulb", label: "Insightful" },
  { type: "celebrate", icon: "ion-trophy", label: "Celebrate" },
];

function ReactionButtons({ handler, myReaction, reactionsCounts, slug }) {
  const [loading, setLoading] = useState(false);
  const { headers, isAuth } = useAuth();

  const handleClick = (type) => {
    if (!isAuth) return alert("You need to login first");

    setLoading(true);

    // Clicking the already-active reaction removes it instead of
    // re-setting the same value.
    toggleReaction({ slug, type: myReaction === type ? null : type, headers })
      .then((article) => handler(article?.reactionsCounts, article?.myReaction ?? null))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <div className="reaction-buttons">
      {REACTIONS.map(({ type, icon, label }) => (
        <button
          key={type}
          className={`btn btn-sm btn-outline-secondary ${myReaction === type ? "active" : ""}`}
          disabled={loading}
          onClick={() => handleClick(type)}
        >
          <i className={icon}></i> {label}
          <span className="counter"> ( {reactionsCounts?.[type] ?? 0} )</span>
        </button>
      ))}
    </div>
  );
}

export default ReactionButtons;
