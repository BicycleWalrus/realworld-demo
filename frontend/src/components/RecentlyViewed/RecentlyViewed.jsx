import { useState } from "react";
import { Link } from "react-router-dom";
import { getRecentlyViewed } from "../../helpers/recentlyViewed";

function RecentlyViewed() {
  const [articles] = useState(getRecentlyViewed);

  if (articles.length === 0) return null;

  return (
    <div className="sidebar recently-viewed">
      <h6>Recently Viewed</h6>
      <ul>
        {articles.map(({ slug, title }) => (
          <li key={slug}>
            <Link to={`/article/${slug}`}>{title}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RecentlyViewed;
