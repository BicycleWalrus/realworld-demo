import Markdown from "markdown-to-jsx";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import ArticleMeta from "../../components/ArticleMeta";
import ArticlesButtons from "../../components/ArticlesButtons";
import ArticleTags from "../../components/ArticleTags";
import BannerContainer from "../../components/BannerContainer";
import ReactionButtons from "../../components/ReactionButtons";
import { useAuth } from "../../context/AuthContext";
import getArticle from "../../services/getArticle";

function Article() {
  const { state } = useLocation();
  const [article, setArticle] = useState(state || {});
  const { title, body, tagList, createdAt, author, myReaction, reactionsCounts } = article || {};
  const { headers, isAuth } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();

  useEffect(() => {
    if (state) return;

    getArticle({ slug, headers })
      .then(setArticle)
      .catch((error) => {
        console.error(error);
        navigate("/not-found", { replace: true });
      });
  }, [isAuth, slug, headers, state, navigate]);

  // Reaction counts/status are never part of the navigation state above
  // (no article-listing response includes them), so they're fetched
  // independently, regardless of whether the effect above skipped its
  // own fetch (REQ-043) — visible to any visitor, not gated on isAuth.
  useEffect(() => {
    getArticle({ slug, headers })
      .then((fetched) =>
        setArticle((prev) => ({
          ...prev,
          myReaction: fetched?.myReaction,
          reactionsCounts: fetched?.reactionsCounts,
        })),
      )
      .catch(console.error);
  }, [slug, headers]);

  const handleReaction = (counts, mine) => {
    setArticle((prev) => ({ ...prev, reactionsCounts: counts, myReaction: mine }));
  };

  return (
    <div className="article-page">
      <BannerContainer>
        <h1>{title}</h1>
        <ArticleMeta author={author} createdAt={createdAt}>
          <ArticlesButtons article={article} setArticle={setArticle} />
        </ArticleMeta>
      </BannerContainer>

      <div className="container page">
        <div className="row article-content">
          <div className="col-md-12">
            {body && <Markdown options={{ forceBlock: true }}>{body}</Markdown>}
            <ArticleTags tagList={tagList} />

            <ReactionButtons
              handler={handleReaction}
              myReaction={myReaction}
              reactionsCounts={reactionsCounts}
              slug={slug}
            />
          </div>
        </div>

        <hr />

        <div className="article-actions">
          <ArticleMeta author={author} createdAt={createdAt}>
            <ArticlesButtons article={article} setArticle={setArticle} />
          </ArticleMeta>
        </div>

        <Outlet />
      </div>
    </div>
  );
}

export default Article;
