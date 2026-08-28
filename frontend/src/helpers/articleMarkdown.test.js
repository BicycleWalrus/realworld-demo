import { articleFilename, articleToMarkdown } from "./articleMarkdown";

// AC-136: the downloaded content is the article's title as a Markdown H1
// followed by its body.
describe("articleToMarkdown", () => {
  it("renders the title as an H1 followed by the body", () => {
    const markdown = articleToMarkdown({ title: "Hello", body: "World body" });

    expect(markdown).toContain("# Hello");
    expect(markdown.indexOf("# Hello")).toBeLessThan(markdown.indexOf("World body"));
  });

  it("coerces a missing title and body to empty strings, never the literal 'undefined'", () => {
    expect(articleToMarkdown({})).not.toContain("undefined");
    expect(articleToMarkdown(undefined)).not.toContain("undefined");
    expect(articleToMarkdown({ title: "Only Title" })).toBe("# Only Title\n\n\n");
  });
});

// AC-137: the downloaded file's name is derived from the article's slug.
describe("articleFilename", () => {
  it("derives the filename from the slug", () => {
    expect(articleFilename("my-slug")).toBe("my-slug.md");
  });

  it("falls back to 'article.md' when the slug is falsy", () => {
    expect(articleFilename("")).toBe("article.md");
    expect(articleFilename(undefined)).toBe("article.md");
    expect(articleFilename(null)).toBe("article.md");
  });
});
