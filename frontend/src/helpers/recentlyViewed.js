const STORAGE_KEY = "recentlyViewedArticles";
const MAX_ENTRIES = 5;

export function getRecentlyViewed() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed({ slug, title }) {
  const withoutDuplicate = getRecentlyViewed().filter(
    (article) => article.slug !== slug,
  );
  const updated = [{ slug, title }, ...withoutDuplicate].slice(
    0,
    MAX_ENTRIES,
  );

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  return updated;
}
