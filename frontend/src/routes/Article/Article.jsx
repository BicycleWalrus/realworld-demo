import Markdown from "markdown-to-jsx";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import ArticleMeta from "../../components/ArticleMeta";
import ArticlesButtons from "../../components/ArticlesButtons";
import ArticleTags from "../../components/ArticleTags";
import BannerContainer from "../../components/BannerContainer";
import DownloadArticle from "../../components/DownloadArticle";
import TableOfContents from "../../components/TableOfContents";
import { useAuth } from "../../context/AuthContext";
import getArticle from "../../services/getArticle";
import { slugify } from "../../helpers/toc";

// REQ-101: tags a rendered heading with an id matching the slug the table
// of contents computes for the same heading text (see helpers/toc.js), so
// clicking a TOC entry can scroll straight to it. Flattens `children` (a
// string, or an array possibly mixing strings with other Markdown nodes)
// to plain text before slugifying, since only the visible text is used.
function headingText(children) {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) {
    return children.map((child) => (typeof child === "string" ? child : "")).join("");
  }
  return "";
}

function headingWithId(Tag) {
  function Heading({ children, ...props }) {
    return (
      <Tag id={slugify(headingText(children))} {...props}>
        {children}
      </Tag>
    );
  }

  return Heading;
}

// Only h1..h6 gain an id via `overrides`; every other Markdown element
// keeps rendering exactly as it did before (forceBlock unchanged).
const mdOptions = {
  forceBlock: true,
  overrides: {
    h1: headingWithId("h1"),
    h2: headingWithId("h2"),
    h3: headingWithId("h3"),
    h4: headingWithId("h4"),
    h5: headingWithId("h5"),
    h6: headingWithId("h6"),
  },
};

function Article() {
  const { state } = useLocation();
  const [article, setArticle] = useState(state || {});
  const { title, body, tagList, createdAt, author, image } = article || {};
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

  return (
    <div className="article-page">
      <BannerContainer>
        <h1>{title}</h1>
        <ArticleMeta author={author} body={body} createdAt={createdAt}>
          <ArticlesButtons article={article} setArticle={setArticle} />
        </ArticleMeta>
      </BannerContainer>

      <div className="container page">
        <div className="row article-content">
          <div className="col-md-12">
            {image && <img src={image} alt="" className="article-cover" />}
            {/* REQ-105/REQ-106: visible to every viewer who can already
                read this article - authed or anonymous, author or not -
                since downloading is purely client-side and grants no
                additional access. */}
            <DownloadArticle article={article} />
            <TableOfContents body={body} />
            {body && <Markdown options={mdOptions}>{body}</Markdown>}
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
