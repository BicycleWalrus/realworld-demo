import Markdown from "markdown-to-jsx";
import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import ArticleMeta from "../../components/ArticleMeta";
import ArticlesButtons from "../../components/ArticlesButtons";
import ArticleTags from "../../components/ArticleTags";
import BannerContainer from "../../components/BannerContainer";
import ReactionBar from "../../components/ReactionBar/ReactionBar";
import TableOfContents from "../../components/TableOfContents";
import { useAuth } from "../../context/AuthContext";
import extractHeadings, {
  createHeadingSlugger,
} from "../../helpers/extractHeadings";
import { recordView } from "../../helpers/recentlyViewed";
import getArticle from "../../services/getArticle";

function Article() {
  const { state } = useLocation();
  const [article, setArticle] = useState(state || {});
  const { title, body, image, tagList, createdAt, author } = article || {};
  const { headers, isAuth } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();

  const headings = useMemo(() => extractHeadings(body), [body]);
  // A fresh slugger per body so the ids assigned here match extractHeadings'
  // ids above (both start their duplicate-heading counters from zero).
  const headingSlugify = useMemo(() => createHeadingSlugger(), [body]);

  useEffect(() => {
    if (state) return;

    getArticle({ slug, headers })
      .then(setArticle)
      .catch((error) => {
        console.error(error);
        navigate("/not-found", { replace: true });
      });
  }, [isAuth, slug, headers, state, navigate]);

  useEffect(() => {
    if (!title) return;

    recordView({ slug, title });
  }, [slug, title]);

  return (
    <div className="article-page">
      <BannerContainer>
        <h1>{title}</h1>
        <ArticleMeta author={author} body={body} createdAt={createdAt}>
          <ArticlesButtons article={article} setArticle={setArticle} />
          <ReactionBar article={article} setArticle={setArticle} />
        </ArticleMeta>
      </BannerContainer>

      <div className="container page">
        <div className="row article-content">
          <div className="col-md-12">
            {image && (
              <img alt={title} className="article-cover-image" src={image} />
            )}
            <TableOfContents headings={headings} />
            {body && (
              <Markdown
                options={{ forceBlock: true, slugify: headingSlugify }}
              >
                {body}
              </Markdown>
            )}
            <ArticleTags tagList={tagList} />
          </div>
        </div>

        <hr />

        <div className="article-actions">
          <ArticleMeta author={author} body={body} createdAt={createdAt}>
            <ArticlesButtons article={article} setArticle={setArticle} />
          </ArticleMeta>
        </div>

        <Outlet />
      </div>
    </div>
  );
}

export default Article;
