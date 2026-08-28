import extractHeadings from "./extractHeadings";

describe("extractHeadings", () => {
  it("returns an empty list for an empty or missing body", () => {
    expect(extractHeadings("")).toEqual([]);
    expect(extractHeadings(undefined)).toEqual([]);
  });

  it("returns an empty list when the body has no headings", () => {
    expect(extractHeadings("Just a paragraph.\n\nAnother one.")).toEqual([]);
  });

  it("extracts headings of multiple levels in document order", () => {
    const body = "# Title\n\nIntro text.\n\n## Section One\n\nMore text.\n\n### Subsection";

    expect(extractHeadings(body)).toEqual([
      { level: 1, text: "Title", id: "title" },
      { level: 2, text: "Section One", id: "section-one" },
      { level: 3, text: "Subsection", id: "subsection" },
    ]);
  });

  it("generates a valid id from a heading with special characters", () => {
    const body = "## Hello, World! (2024)";

    expect(extractHeadings(body)).toEqual([
      { level: 2, text: "Hello, World! (2024)", id: "hello-world-2024" },
    ]);
  });

  it("dedupes ids for repeated heading text", () => {
    const body = "# Overview\n\ntext\n\n# Overview";

    expect(extractHeadings(body)).toEqual([
      { level: 1, text: "Overview", id: "overview" },
      { level: 1, text: "Overview", id: "overview-1" },
    ]);
  });

  it("ignores lines that look like headings inside a fenced code block", () => {
    const body = "# Real Heading\n\n```\n# not a heading\n```\n\n## Also Real";

    expect(extractHeadings(body)).toEqual([
      { level: 1, text: "Real Heading", id: "real-heading" },
      { level: 2, text: "Also Real", id: "also-real" },
    ]);
  });
});
