import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import ArticlesPreview from "../../components/ArticlesPreview";
import { useAuth } from "../../context/AuthContext";
import getReadingList from "../../services/getReadingList";

function ReadingList() {
  const [{ articles, articlesCount }, setArticlesData] = useState({
    articles: [],
    articlesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const { headers } = useAuth();

  useEffect(() => {
    setLoading(true);

    getReadingList({ headers })
      .then(setArticlesData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [headers]);

  const handlePageChange = ({ selected: page }) => {
    getReadingList({ headers, page }).then(setArticlesData).catch(console.error);
  };

  return (
    <div className="container page">
      <h1>My Reading List</h1>

      {loading ? (
        <div className="article-preview">
          <em>Loading reading list...</em>
        </div>
      ) : articles.length > 0 ? (
        <>
          <ArticlesPreview articles={articles} updateArticles={setArticlesData} />

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
            pageCount={Math.ceil(articlesCount / 3)}
            pageLinkClassName="page-link"
            previousClassName="page-item"
            previousLabel={<i className="ion-arrow-left-b"></i>}
            previousLinkClassName="page-link"
            renderOnZeroPageCount={null}
          />
        </>
      ) : (
        <div className="article-preview">Your reading list is empty.</div>
      )}
    </div>
  );
}

export default ReadingList;
