import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ArticlesPreview from "../components/ArticlesPreview";
import ContainerRow from "../components/ContainerRow";
import { useAuth } from "../context/AuthContext";
import getReadLaterList from "../services/getReadLaterList";

function ReadLater() {
  const [{ articles, loading }, setArticlesData] = useState({
    articles: [],
    loading: true,
  });
  const { headers, isAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuth) return navigate("/");

    getReadLaterList({ headers })
      .then(({ articles }) => setArticlesData({ articles, loading: false }))
      .catch(console.error);
  }, [headers, isAuth, navigate]);

  return (
    <div className="home-page">
      <ContainerRow type="page">
        <div className="col-md-9 offset-md-1 col-xs-12">
          <h1>Read Later</h1>
          <ArticlesPreview
            articles={articles}
            loading={loading}
            updateArticles={setArticlesData}
          />
        </div>
      </ContainerRow>
    </div>
  );
}

export default ReadLater;
