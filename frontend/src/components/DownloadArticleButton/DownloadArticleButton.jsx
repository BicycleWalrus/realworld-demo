import buildArticleMarkdown from "../../helpers/buildArticleMarkdown";
import downloadTextFile from "../../helpers/downloadTextFile";

function DownloadArticleButton({ title, body, slug }) {
  const handleClick = () => {
    downloadTextFile(`${slug}.md`, buildArticleMarkdown({ title, body }));
  };

  return (
    <button
      className="btn btn-sm"
      style={{ color: "#777" }}
      onClick={handleClick}
      disabled={!body}
    >
      <i className="ion-android-download"></i> Download Markdown
    </button>
  );
}

export default DownloadArticleButton;
