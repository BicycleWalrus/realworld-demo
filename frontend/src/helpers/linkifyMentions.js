const MENTION_PATTERN = /@([a-zA-Z0-9_]+)/g;

// Unique @word candidates in a comment body, in first-occurrence order.
export function extractMentionCandidates(body) {
  if (!body) return [];

  const seen = new Set();
  for (const match of body.matchAll(MENTION_PATTERN)) seen.add(match[1]);

  return [...seen];
}

// Splits a comment body into plain-text and mention segments. A mention
// segment is only produced when its username (case-insensitively) appears
// in knownUsernames - an @word with no matching user renders as plain text.
// The segment's `username` is the known, canonically-cased value (not
// necessarily what was typed), since profile lookups are case-sensitive.
export default function linkifyMentions(body, knownUsernames = []) {
  if (!body) return [];

  const canonicalByLower = new Map(
    knownUsernames.map((name) => [name.toLowerCase(), name]),
  );
  const parts = [];
  let lastIndex = 0;

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const [fullMatch, username] = match;
    const start = match.index;

    if (start > lastIndex) {
      parts.push({ type: "text", value: body.slice(lastIndex, start) });
    }

    const canonical = canonicalByLower.get(username.toLowerCase());
    parts.push(
      canonical
        ? { type: "mention", username: canonical, value: fullMatch }
        : { type: "text", value: fullMatch },
    );

    lastIndex = start + fullMatch.length;
  }

  if (lastIndex < body.length) {
    parts.push({ type: "text", value: body.slice(lastIndex) });
  }

  return parts;
}
