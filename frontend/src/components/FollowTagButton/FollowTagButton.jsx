import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFeedContext } from "../../context/FeedContext";
import getTag from "../../services/getTag";
import toggleFollowTag from "../../services/toggleFollowTag";

function FollowTagButton() {
  const { tabName, tagName } = useFeedContext();
  const { headers, isAuth } = useAuth();
  const [following, setFollowing] = useState(false);

  const visible = isAuth && tabName === "tag" && !!tagName;

  // The displayed state is the server's actual state (REQ-065), fetched
  // for whichever tag tab is active — not a locally-remembered toggle.
  useEffect(() => {
    if (!visible) return undefined;

    let current = true;
    getTag({ headers, name: tagName })
      .then((tag) => {
        if (current) setFollowing(tag.following);
      })
      .catch(console.error);

    return () => {
      current = false;
    };
  }, [headers, tagName, visible]);

  if (!visible) return null;

  const handleToggle = () => {
    toggleFollowTag({ follow: !following, headers, name: tagName })
      .then((tag) => setFollowing(tag.following))
      .catch(console.error);
  };

  return (
    <button className="btn btn-sm btn-outline-primary" onClick={handleToggle}>
      {following ? `Unfollow #${tagName}` : `Follow #${tagName}`}
    </button>
  );
}

export default FollowTagButton;
