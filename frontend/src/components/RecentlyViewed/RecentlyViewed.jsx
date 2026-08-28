import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getRecentlyViewed } from "../../helpers/recentlyViewed";

function RecentlyViewed() {
  const [articles, setArticles] = useState([]);

  useEffect(() => {
    setArticles(getRecentlyViewed());
  }, []);

  return (
    <aside className="col-md-3">
      <div className="sidebar">
        <h6>Recently Viewed</h6>
        {articles.length > 0 ? (
          <ul>
            {articles.map(({ slug, title }) => (
              <li key={slug}>
                <Link to={`/article/${slug}`}>{title}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>No recently viewed articles yet.</p>
        )}
      </div>
    </aside>
  );
}

export default RecentlyViewed;
