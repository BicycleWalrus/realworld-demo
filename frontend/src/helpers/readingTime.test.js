import readingTime from "./readingTime";

describe("readingTime", () => {
  it("returns the 1-minute minimum for an empty body", () => {
    expect(readingTime("")).toBe("1 min read");
  });

  it("returns the 1-minute minimum when no body is provided", () => {
    expect(readingTime(undefined)).toBe("1 min read");
  });

  it("returns the 1-minute minimum for a very short body", () => {
    expect(readingTime("A short article.")).toBe("1 min read");
  });

  it("stays at 1 minute exactly at the 200-word boundary", () => {
    const body = new Array(200).fill("word").join(" ");

    expect(readingTime(body)).toBe("1 min read");
  });

  it("rounds up to the next whole minute", () => {
    const body = new Array(201).fill("word").join(" ");

    expect(readingTime(body)).toBe("2 min read");
  });

  it("handles a very long body without producing NaN or crashing", () => {
    const body = new Array(10000).fill("word").join(" ");

    expect(readingTime(body)).toBe("50 min read");
  });
});
