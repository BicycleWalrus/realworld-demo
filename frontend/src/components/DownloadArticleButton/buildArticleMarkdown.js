function buildArticleMarkdown({ title, body }) {
  return `# ${title}\n\n${body}`;
}

export default buildArticleMarkdown;
