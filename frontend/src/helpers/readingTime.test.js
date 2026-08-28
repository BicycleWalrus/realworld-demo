import readingTime from "./readingTime";

// AC-13.1: reading time reflects word count of the body
it("should estimate reading time from word count", () => {
  const body = new Array(400).fill("word").join(" ");

  expect(readingTime(body)).toBe("2 min read");
});

// AC-13.3: empty/near-empty bodies produce a minimum estimate, no NaN
it("should return a minimum of 1 min read for an empty body", () => {
  expect(readingTime("")).toBe("1 min read");
  expect(readingTime(undefined)).toBe("1 min read");
});

// AC-13.4: very long bodies produce a proportionally larger, non-crashing estimate
it("should scale up for a very long body without crashing", () => {
  const body = new Array(20000).fill("word").join(" ");

  expect(readingTime(body)).toBe("100 min read");
});

// Approach 2: markdown syntax noise should not inflate the word count
it("should strip markdown syntax before counting words", () => {
  const body = "# Heading\n\n**bold** _italic_ `code` [link](https://x.com)";

  expect(readingTime(body)).toBe("1 min read");
});
