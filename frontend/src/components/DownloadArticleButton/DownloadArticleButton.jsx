function DownloadArticleButton({ body, slug, title }) {
  const handleClick = () => {
    const markdown = `# ${title}\n\n${body}`;
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${slug}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
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
