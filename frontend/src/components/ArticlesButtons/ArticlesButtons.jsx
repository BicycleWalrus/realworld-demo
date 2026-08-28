import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ArticleAuthorButtons from "../ArticleAuthorButtons";
import FavButton from "../FavButton";
import FollowButton from "../FollowButton";
import ReactionBar from "../ReactionBar";

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

  const handleReaction = ({ myReaction, reactions }) => {
    setArticle((prev) => ({ ...prev, myReaction, reactions }));
  };

  return loggedUser.username === username ? (
    <ArticleAuthorButtons {...article} slug={slug} />
  ) : (
    <>
      <FollowButton {...author} handler={followHandler} />
      <FavButton {...article} handler={handleFav} text />
      <ReactionBar {...article} handler={handleReaction} slug={slug} />
    </>
  );
}

export default ArticlesButtons;
