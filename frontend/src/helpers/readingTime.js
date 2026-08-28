// REQ-092, REQ-093: estimated reading time derived from an article body, at
// ~200 words per minute, rounded up, with a guaranteed minimum of 1 minute
// so an empty/near-empty body never renders "0 min read" or NaN.
const WORDS_PER_MINUTE = 200;

export default function readingTime(body) {
  const text = typeof body === "string" ? body : "";
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));

  return `${minutes} min read`;
}
