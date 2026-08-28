import { useState } from "react";
import { Link } from "react-router-dom";
import { getRecentlyViewed } from "../../helpers/recentlyViewed";

function RecentlyViewed() {
  const [articles] = useState(getRecentlyViewed);

  if (articles.length === 0) return null;

  return (
    <aside className="col-md-3">
      <div className="sidebar">
        <h6>Recently Viewed</h6>
        <ul className="tag-list">
          {articles.map(({ slug, title }) => (
            <li key={slug}>
              <Link to={`/article/${slug}`}>{title}</Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default RecentlyViewed;
