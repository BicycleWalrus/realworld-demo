import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ArticleAuthorButtons from "../ArticleAuthorButtons";
import DownloadArticleButton from "../DownloadArticleButton";
import FavButton from "../FavButton";
import FollowButton from "../FollowButton";
import SaveLaterButton from "../SaveLaterButton";

function ArticlesButtons({ article, setArticle }) {
  const { author: { username } = {}, author } = article || {};
  const { loggedUser } = useAuth();
  const { slug } = useParams();

  const followHandler = (author) => {
    setArticle((prev) => ({ ...prev, author }));
  };

  const handleFav = ({ favorited, favoritesCount }) => {
    setArticle((prev) => ({ ...prev, favorited, favoritesCount }));
  };

  const handleSaveLater = ({ isSaved }) => {
    setArticle((prev) => ({ ...prev, isSaved }));
  };

  return (
    <>
      {loggedUser.username === username ? (
        <ArticleAuthorButtons {...article} slug={slug} />
      ) : (
        <>
          <FollowButton {...author} handler={followHandler} />
          <FavButton {...article} handler={handleFav} text />{" "}
        </>
      )}
      <DownloadArticleButton {...article} slug={slug} />
      <SaveLaterButton isSaved={article?.isSaved} handler={handleSaveLater} slug={slug} />
    </>
  );
}

export default ArticlesButtons;
