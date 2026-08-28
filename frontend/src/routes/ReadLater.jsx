import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ReactPaginate from "react-paginate";
import ContainerRow from "../components/ContainerRow";
import ArticlesPreview from "../components/ArticlesPreview";
import { useAuth } from "../context/AuthContext";
import getReadLater from "../services/getReadLater";

const PAGE_SIZE = 3;

// REQ-087/REQ-088: the authenticated user's own saved (read-later)
// articles, most-recently-added first (server-ordered), paginated. The
// list is private - an unauthenticated visitor sees a sign-in prompt
// instead, rather than any saved-article data. Uses a local fetch (like
// Directory) instead of useArticles/ArticlesPagination, since those are
// wired to the `api/articles` endpoint's location shapes, not
// `api/read-later`.
function ReadLater() {
  const { headers, isAuth } = useAuth();
  const [{ articles, articlesCount }, setArticlesData] = useState({
    articles: [],
    articlesCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuth) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getReadLater({ headers, limit: PAGE_SIZE, page: 0 })
      .then(setArticlesData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [headers, isAuth]);

  const handlePageChange = ({ selected: page }) => {
    getReadLater({ headers, limit: PAGE_SIZE, page })
      .then(setArticlesData)
      .catch(console.error);
  };

  if (!isAuth) {
    return (
      <div className="read-later-page">
        <ContainerRow type="page">
          <div className="col-md-10 offset-md-1">
            <h1>Read Later</h1>
            <p>
              <Link to="/login">Sign in</Link> to see your read-later list.
            </p>
          </div>
        </ContainerRow>
      </div>
    );
  }

  const totalPages = Math.ceil(articlesCount / PAGE_SIZE);

  return (
    <div className="read-later-page">
      <ContainerRow type="page">
        <div className="col-md-10 offset-md-1">
          <h1>Read Later</h1>

          {loading ? (
            <div className="article-preview">
              <em>Loading your read-later list...</em>
            </div>
          ) : articles.length > 0 ? (
            <>
              <ArticlesPreview
                articles={articles}
                loading={loading}
                updateArticles={setArticlesData}
              />

              {totalPages > 1 && (
                <ReactPaginate
                  activeClassName="active"
                  breakClassName="page-item"
                  breakLabel="..."
                  breakLinkClassName="page-link"
                  containerClassName="pagination pagination-sm"
                  nextClassName="page-item"
                  nextLabel={<i className="ion-arrow-right-b"></i>}
                  nextLinkClassName="page-link"
                  onPageChange={handlePageChange}
                  pageClassName="page-item"
                  pageCount={totalPages}
                  pageLinkClassName="page-link"
                  previousClassName="page-item"
                  previousLabel={<i className="ion-arrow-left-b"></i>}
                  previousLinkClassName="page-link"
                  renderOnZeroPageCount={null}
                />
              )}
            </>
          ) : (
            <div className="article-preview">
              You haven&apos;t saved any articles yet.
            </div>
          )}
        </div>
      </ContainerRow>
    </div>
  );
}

export default ReadLater;
