import { extractHeadings } from "../../helpers/toc";

// REQ-101: renders a linked table of contents derived from the article
// body's Markdown headings. Renders nothing when the body has no headings
// (REQ-102), so there is never an empty box or error.
//
// The app uses HashRouter everywhere, so a plain `href="#slug"` link would
// change the route hash instead of scrolling. Each entry is a button that
// scrolls the matching heading (tagged with a matching id, see Article.jsx)
// into view directly.
function TableOfContents({ body }) {
  const headings = extractHeadings(body);

  if (headings.length === 0) return null;

  const handleClick = (slug) => {
    document.getElementById(slug)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <nav className="table-of-contents">
      <ul>
        {headings.map((heading) => (
          <li
            key={heading.slug}
            style={{ marginLeft: `${(heading.level - 1) * 16}px` }}
          >
            <button
              type="button"
              className="toc-entry"
              onClick={() => handleClick(heading.slug)}
            >
              {heading.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default TableOfContents;
