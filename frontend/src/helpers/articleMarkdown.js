// REQ-105: builds a standalone Markdown representation of an article for
// client-side download - the title as an H1, then the body (already
// Markdown) as-is. Missing title/body are coerced to "" so the output
// never contains the literal string "undefined".
export function articleToMarkdown({ title, body } = {}) {
  return `# ${title ?? ""}\n\n${body ?? ""}\n`;
}

// REQ-106: the downloaded file's name is derived from the article's slug
// as `<slug>.md`; a falsy slug falls back to a predictable "article.md".
export function articleFilename(slug) {
  return `${slug || "article"}.md`;
}
