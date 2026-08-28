import { Link } from "react-router-dom";
import linkifyMentions from "../../helpers/linkifyMentions";

function MentionText({ body, knownUsernames }) {
  return (
    <p className="card-text">
      {linkifyMentions(body, knownUsernames).map((part, index) =>
        part.type === "mention" ? (
          <Link key={index} to={`/profile/${part.username}`}>
            {part.value}
          </Link>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </p>
  );
}

export default MentionText;
