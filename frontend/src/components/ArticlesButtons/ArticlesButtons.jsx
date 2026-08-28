import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ArticleAuthorButtons from "../ArticleAuthorButtons";
import FavButton from "../FavButton";
import FollowButton from "../FollowButton";
import ReadLaterButton from "../ReadLaterButton";
import Reactions from "../Reactions";

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

  // REQ-086: additive - keeps the article's private readLater flag in
  // sync after a save/unsave, alongside the existing favorite handling.
  const handleReadLater = ({ readLater }) => {
    setArticle((prev) => ({ ...prev, readLater }));
  };

  // REQ-094/REQ-095: additive - reactions are independent of Favorites
  // (REQ-096), so this only ever updates reactionCounts/reaction, never
  // favorited/favoritesCount.
  const handleReaction = ({ reactionCounts, reaction }) => {
    setArticle((prev) => ({ ...prev, reactionCounts, reaction }));
  };

  return loggedUser.username === username ? (
    <>
      <ArticleAuthorButtons {...article} slug={slug} />
      <Reactions
        reactionCounts={article?.reactionCounts}
        reaction={article?.reaction}
        slug={slug}
        handler={handleReaction}
      />
    </>
  ) : (
    <>
      <FollowButton {...author} handler={followHandler} />
      <FavButton {...article} handler={handleFav} text />
      <ReadLaterButton readLater={article?.readLater} slug={slug} handler={handleReadLater} />
      <Reactions
        reactionCounts={article?.reactionCounts}
        reaction={article?.reaction}
        slug={slug}
        handler={handleReaction}
      />
    </>
  );
}

export default ArticlesButtons;
