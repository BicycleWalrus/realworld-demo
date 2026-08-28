function TableOfContents({ headings }) {
  if (!headings || headings.length === 0) return null;

  // preventDefault so this in-page anchor doesn't reach HashRouter's own
  // hash-based routing (which would otherwise treat "#some-heading" as a
  // navigation to a route named "/some-heading").
  const handleClick = (id) => (event) => {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav aria-label="Table of contents" className="table-of-contents">
      <ul>
        {headings.map(({ id, level, text }) => (
          <li className={`toc-level-${level}`} key={id}>
            <a href={`#${id}`} onClick={handleClick(id)}>
              {text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default TableOfContents;
