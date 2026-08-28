const WORDS_PER_MINUTE = 200;

export default function readingTime(body) {
  const wordCount = (body || "").trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));

  return `${minutes} min read`;
}
