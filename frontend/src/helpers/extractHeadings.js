// Mirrors markdown-to-jsx's own (lenient, non-CommonMark-strict) heading
// rule exactly: no space required after the #s, and leading spaces are
// allowed. Diverging from this — even to be "more correct" — would mean a
// heading the renderer actually produces an id for goes silently missing
// from the table of contents.
const HEADING_LINE = /^ *(#{1,6}) *(.+?)(?: +#*)?$/;
// Mirrors markdown-to-jsx's fence rule: 3+ backticks OR 3+ tildes.
const FENCE_LINE = /^\s*(`{3,}|~{3,})/;

function slugifyHeading(text) {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section"
  );
}

// Shared by extractHeadings and Article.jsx's <Markdown options={{ slugify }}>
// so the ids assigned to rendered headings match the ids linked to here.
// Must be given a fresh instance per article body so duplicate-heading
// counters don't leak between articles/renders.
export function createHeadingSlugger() {
  const seenCounts = new Map();

  return function slug(text) {
    const base = slugifyHeading(text);
    const seen = seenCounts.get(base) || 0;
    seenCounts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen}`;
  };
}

export default function extractHeadings(body) {
  if (!body) return [];

  const slug = createHeadingSlugger();
  const headings = [];
  let inFence = false;

  for (const line of body.split("\n")) {
    if (FENCE_LINE.test(line.trim())) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = line.match(HEADING_LINE);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2].trim();
    headings.push({ level, text, id: slug(text) });
  }

  return headings;
}
