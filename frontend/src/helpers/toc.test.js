import { extractHeadings, slugify } from "./toc";

// AC-132: slugify normalizes heading text into a stable, URL/id-safe slug.
describe("slugify", () => {
  it("lowercases and hyphenates a simple heading", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("collapses punctuation and repeated separators into a single hyphen", () => {
    expect(slugify("Getting Started: Step 1!!")).toBe("getting-started-step-1");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugify("  --Intro--  ")).toBe("intro");
  });
});

// AC-132/AC-133: headings are parsed from ATX-style Markdown lines only,
// and a body with none of those (or no body at all) yields an empty list.
describe("extractHeadings", () => {
  it("extracts ATX headings with their level, text, and slug", () => {
    const body = "# A\nsome intro text\n## B sub\nmore body text";

    expect(extractHeadings(body)).toEqual([
      { level: 1, text: "A", slug: "a" },
      { level: 2, text: "B sub", slug: "b-sub" },
    ]);
  });

  it("returns an empty array for a body with no headings", () => {
    expect(extractHeadings("just some plain paragraph text.")).toEqual([]);
  });

  it("returns an empty array for a non-string body", () => {
    expect(extractHeadings(undefined)).toEqual([]);
    expect(extractHeadings(null)).toEqual([]);
    expect(extractHeadings(42)).toEqual([]);
  });
});
