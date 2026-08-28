import buildArticleMarkdown from "./buildArticleMarkdown";

it("should build markdown from a title and body", () => {
  const title = "Hello World";
  const body = "Some **markdown** body.";

  expect(buildArticleMarkdown({ title, body })).toBe(
    "# Hello World\n\nSome **markdown** body."
  );
});
