import buildArticleMarkdown from "./buildArticleMarkdown";

// AC-081: downloaded content begins with the title as a Markdown heading,
// followed by the body.
it("renders the title as a top-level heading followed by the body", () => {
  const title = "How to Train Your Dragon";
  const body = "Some body text.";

  expect(buildArticleMarkdown({ title, body })).toBe(
    "# How to Train Your Dragon\n\nSome body text.",
  );
});

it("passes body content through unchanged, including existing Markdown/newlines", () => {
  const title = "Title";
  const body = "## Subheading\n\n- one\n- two\n\n> a quote";

  expect(buildArticleMarkdown({ title, body })).toBe(
    "# Title\n\n## Subheading\n\n- one\n- two\n\n> a quote",
  );
});
