const RECENTLY_VIEWED_KEY = "recentlyViewed";
const MAX_RECENTLY_VIEWED = 10;

// REQ-107/REQ-108: per-browser "recently viewed" history, stored in
// localStorage so it works for every visitor including anonymous ones
// (same idiom as AuthContext's module-load localStorage read). Reads are
// wrapped in try/catch so a storage failure (disabled storage, malformed
// JSON, etc.) never crashes the caller - it just behaves as an empty
// history.
export function getRecentlyViewed() {
  try {
    const stored = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

// AC-139: records an article as viewed, moving it to the top if it was
// already present (no consecutive/duplicate entries for the same
// article), and caps the history at MAX_RECENTLY_VIEWED, dropping the
// oldest entries first. Stores only { slug, title } - enough for the
// widget's links. Writes are wrapped in try/catch so a storage failure
// never crashes the caller.
export function addRecentlyViewed(article) {
  const { slug, title } = article || {};
  if (!slug) return getRecentlyViewed();

  const withoutExisting = getRecentlyViewed().filter((entry) => entry.slug !== slug);
  const next = [{ slug, title }, ...withoutExisting].slice(0, MAX_RECENTLY_VIEWED);

  try {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable/full: the in-memory result is still returned,
    // but nothing is persisted.
  }

  return next;
}

export { RECENTLY_VIEWED_KEY, MAX_RECENTLY_VIEWED };
