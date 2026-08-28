// REQ-101: table-of-contents headings are derived from the article body's
// ATX-style Markdown headings (`# `..`###### `), each producing a stable
// slug id used both to tag the rendered heading and to target the scroll.
//
// Known limitation: headings are detected line-by-line without tracking
// fenced code blocks, so a line starting with `#` inside a ``` fence would
// be (incorrectly) treated as a heading. This mirrors the "keep it simple"
// scope for this feature and is not expected to matter for typical article
// bodies.
const ATX_HEADING = /^(#{1,6})\s+(.+?)\s*#*\s*$/;

export function slugify(text) {
  return String(text ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function extractHeadings(body) {
  const text = typeof body === "string" ? body : "";

  return text
    .split("\n")
    .map((line) => line.match(ATX_HEADING))
    .filter(Boolean)
    .map((match) => {
      const level = match[1].length;
      const headingText = match[2].trim();

      return { level, text: headingText, slug: slugify(headingText) };
    });
}
