import readingTime from "./readingTime";

function words(count) {
  return Array.from({ length: count }, (_, i) => `word${i}`).join(" ");
}

// AC-123: the estimate scales with word count at ~200 words/minute.
it("estimates 1 min read for a ~200-word body", () => {
  expect(readingTime(words(200))).toBe("1 min read");
});

it("estimates 2 min read for a 201-word body", () => {
  expect(readingTime(words(201))).toBe("2 min read");
});

it("estimates 4 min read for an 800-word body", () => {
  expect(readingTime(words(800))).toBe("4 min read");
});

// AC-124: empty/near-empty/missing bodies never produce NaN or a crash, and
// always floor at "1 min read".
it("returns 1 min read for an empty string", () => {
  expect(readingTime("")).toBe("1 min read");
});

it("returns 1 min read for a whitespace-only string", () => {
  expect(readingTime("   \n\t  ")).toBe("1 min read");
});

it("returns 1 min read for an undefined body", () => {
  expect(readingTime(undefined)).toBe("1 min read");
});

it("returns 1 min read for a null body", () => {
  expect(readingTime(null)).toBe("1 min read");
});

// AC-124: a very long body still produces a finite, non-NaN estimate.
it("returns a finite estimate for a very long body", () => {
  const result = readingTime(words(5000));

  expect(result).toBe("25 min read");
  expect(result).not.toMatch(/NaN/);
});
