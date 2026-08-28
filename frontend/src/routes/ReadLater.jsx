import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ArticlesPagination from "../components/ArticlesPagination";
import ArticlesPreview from "../components/ArticlesPreview";
import ContainerRow from "../components/ContainerRow";
import { useAuth } from "../context/AuthContext";
import useArticleList from "../hooks/useArticles";

// A visitor without an active session is redirected away, consistent with
// the account settings page (REQ-036).
function ReadLater() {
  const { isAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuth) navigate("/login", { replace: true });
  }, [isAuth, navigate]);

  const { articles, articlesCount, loading, setArticlesData } = useArticleList({
    location: "readLater",
  });

  return (
    <div className="read-later-page">
      <ContainerRow type="page">
        <div className="col-xs-12 col-md-10 offset-md-1">
          <h1>Read Later</h1>

          {loading ? (
            <div className="article-preview">
              <em>Loading your saved articles...</em>
            </div>
          ) : articles.length > 0 ? (
            <>
              <ArticlesPreview
                articles={articles}
                loading={loading}
                updateArticles={setArticlesData}
              />

              <ArticlesPagination
                articlesCount={articlesCount}
                location="readLater"
                updateArticles={setArticlesData}
              />
            </>
          ) : (
            <div className="article-preview">
              You haven't saved any articles yet.
            </div>
          )}
        </div>
      </ContainerRow>
    </div>
  );
}

export default ReadLater;
