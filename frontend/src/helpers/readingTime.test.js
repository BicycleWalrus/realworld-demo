import readingTime from "./readingTime";

it("should estimate reading time from word count at 200 words/minute", () => {
  const body = new Array(400).fill("word").join(" ");

  expect(readingTime(body)).toBe("2 min read");
});

it("should round up a partial minute", () => {
  const body = new Array(201).fill("word").join(" ");

  expect(readingTime(body)).toBe("2 min read");
});

it("should return a minimum of 1 min read for a very short body", () => {
  expect(readingTime("just a few words")).toBe("1 min read");
});

it("should return a minimum of 1 min read for an empty body", () => {
  expect(readingTime("")).toBe("1 min read");
});

it("should not crash or return NaN for a missing body", () => {
  expect(readingTime(undefined)).toBe("1 min read");
  expect(readingTime(null)).toBe("1 min read");
});

it("should collapse repeated whitespace when counting words", () => {
  const body = "word1   word2\n\nword3\tword4";

  expect(readingTime(body)).toBe("1 min read");
});
