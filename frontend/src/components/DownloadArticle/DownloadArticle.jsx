import { articleFilename, articleToMarkdown } from "../../helpers/articleMarkdown";

// REQ-105/REQ-106: lets any viewer who can already read this article
// download it as a standalone Markdown file, entirely client-side - no
// backend/service call is involved. Only rendered once the article (and
// therefore its slug) has loaded, so there is nothing to download before
// then.
function DownloadArticle({ article }) {
  const { slug, title, body } = article || {};

  if (!slug) return null;

  const handleClick = () => {
    const markdown = articleToMarkdown({ title, body });
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = articleFilename(slug);
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      className="btn btn-sm btn-outline-secondary"
      onClick={handleClick}
    >
      <i className="ion-ios-download"></i> Download as Markdown
    </button>
  );
}

export default DownloadArticle;
