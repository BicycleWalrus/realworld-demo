import buildArticleMarkdown from "./buildArticleMarkdown";

function DownloadArticleButton({ body, slug, title }) {
  const handleClick = () => {
    const content = buildArticleMarkdown({ title, body });
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${slug}.md`;
    anchor.click();

    URL.revokeObjectURL(url);
  };

  return (
    <button className="btn btn-sm btn-outline-secondary" onClick={handleClick}>
      <i className="ion-android-download"></i> Download
    </button>
  );
}

export default DownloadArticleButton;
