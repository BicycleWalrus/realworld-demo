import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import getTags from "../../services/getTags";
import TagButton from "./TagButton";

function PopularTags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const { headers } = useAuth();

  useEffect(() => {
    setLoading(true);

    getTags({ headers })
      .then(setTags)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [headers]);

  return (
    <aside className="col-md-3">
      <div className="sidebar">
        <h6>Popular Tags</h6>
        <div className="tag-list">
          {tags.length > 0 ? (
            <TagButton tagsList={tags} updateTags={setTags} />
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
