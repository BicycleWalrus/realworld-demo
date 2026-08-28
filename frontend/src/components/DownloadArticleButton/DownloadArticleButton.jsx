function DownloadArticleButton({ body, slug, title }) {
  const handleClick = () => {
    const markdown = `# ${title}\n\n${body}`;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug}.md`;

    try {
      document.body.appendChild(link);
      link.click();
    } finally {
      document.body.removeChild(link);
      // Revoked on a delay, not synchronously after click(): some browsers
      // (e.g. Safari) read the blob: URL asynchronously to save the file,
      // so revoking it immediately can produce an empty/failed download.
      setTimeout(() => URL.revokeObjectURL(url), 0);
    }
  };

  return (
    <button
      className="btn btn-sm btn-outline-secondary"
      onClick={handleClick}
    >
      <i className="ion-android-download"></i> Download
    </button>
  );
}

export default DownloadArticleButton;
