import { useState } from "react";
import { Link } from "react-router-dom";
import { getRecentlyViewed } from "../../helpers/recentlyViewed";

// REQ-108: shows the visitor's per-browser recently-viewed history,
// most-recent first (the stored order from recentlyViewed.js is already
// newest-first), capped at 10 entries with no duplicates. Reads
// localStorage once on mount - this reflects the history as of page
// load, not live updates from other tabs/components.
function RecentlyViewed() {
  const [recentlyViewed] = useState(getRecentlyViewed);

  if (recentlyViewed.length === 0) return null;

  return (
    <aside className="col-md-3">
      <div className="sidebar">
        <h6>Recently Viewed</h6>
        <ul className="tag-list">
          {recentlyViewed.map(({ slug, title }) => (
            <li key={slug} className="tag-default tag-pill">
              <Link to={`/article/${slug}`}>{title}</Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default RecentlyViewed;
