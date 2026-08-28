import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import getFollowedTags from "../../services/getFollowedTags";
import getTags from "../../services/getTags";
import toggleFollowTag from "../../services/toggleFollowTag";
import TagButton from "./TagButton";

function PopularTags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [followed, setFollowed] = useState(new Set());
  const { headers, isAuth } = useAuth();

  useEffect(() => {
    setLoading(true);

    getTags()
      .then(setTags)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // REQ-089: load the authenticated user's followed tags once there's a
  // tag list to reflect follow state against; anonymous visitors never see
  // follow state (mirrors the anonymous `following`/`favorited` defaults
  // elsewhere in the API, REQ-028).
  useEffect(() => {
    if (!isAuth || tags.length === 0) {
      setFollowed(new Set());
      return;
    }

    getFollowedTags({ headers })
      .then((names) => setFollowed(new Set(names)))
      .catch(console.error);
  }, [isAuth, headers, tags]);

  const handleToggleFollow = (name) => {
    const following = followed.has(name);

    toggleFollowTag({ name, following, headers })
      .then(() => {
        setFollowed((prev) => {
          const next = new Set(prev);
          if (following) next.delete(name);
          else next.add(name);
          return next;
        });
      })
      .catch(console.error);
  };

  return (
    <aside className="col-md-3">
      <div className="sidebar">
        <h6>Popular Tags</h6>
        <div className="tag-list">
          {tags.length > 0 ? (
            <TagButton
              tagsList={tags}
              isAuth={isAuth}
              followed={followed}
              onToggleFollow={handleToggleFollow}
            />
          ) : loading ? (
            <p>Loading tags...</p>
          ) : (
            <p>Tags list not available</p>
          )}
        </div>
      </div>
    </aside>
  );
}

export default PopularTags;
