import ArticlesPagination from "../components/ArticlesPagination";
import ArticlesPreview from "../components/ArticlesPreview";
import { useFeedContext } from "../context/FeedContext";
import useArticleList from "../hooks/useArticles";

function HomeArticles() {
  const { searchTerm, tabName, tagName } = useFeedContext();

  const { articles, articlesCount, loading, setArticlesData } = useArticleList({
    location: tabName,
    searchTerm,
    tabName,
    tagName,
  });

  return loading ? (
    <div className="article-preview">
      <em>Loading articles list...</em>
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
        location={tabName}
        searchTerm={searchTerm}
        tagName={tagName}
        updateArticles={setArticlesData}
      />
    </>
  ) : (
    <div className="article-preview">Articles not available.</div>
  );
}

export default HomeArticles;
