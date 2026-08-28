import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import toggleReaction from "../../services/toggleReaction";

const REACTIONS = [
  { icon: "ion-thumbsup", type: "like" },
  { icon: "ion-flash", type: "insightful" },
  { icon: "ion-trophy", type: "celebrate" },
];

function ReactionBar({ handler, myReaction, reactions, slug }) {
  const [loading, setLoading] = useState(false);
  const { headers, isAuth } = useAuth();

  const handleClick = (type) => {
    if (!isAuth) return alert("You need to login first");

    setLoading(true);

    toggleReaction({ headers, remove: myReaction === type, slug, type })
      .then(handler)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  return (
    <span className="reaction-bar">
      {REACTIONS.map(({ icon, type }) => (
        <button
          className={`btn btn-sm btn-outline-primary ${myReaction === type ? "active" : ""}`}
          disabled={loading}
          key={type}
          onClick={() => handleClick(type)}
        >
          <i className={icon}></i>
          <span className="counter"> ( {reactions?.[type] || 0} )</span>
        </button>
      ))}
    </span>
  );
}

export default ReactionBar;
