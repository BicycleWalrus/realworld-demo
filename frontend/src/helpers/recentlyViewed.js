const STORAGE_KEY = "recentlyViewed";
const MAX_ENTRIES = 5;

export function getRecentlyViewed() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored) ? stored : [];
  } catch {
    return [];
  }
}

export function recordView({ slug, title }) {
  const withoutExisting = getRecentlyViewed().filter(
    (entry) => entry.slug !== slug,
  );
  const updated = [{ slug, title }, ...withoutExisting].slice(0, MAX_ENTRIES);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  return updated;
}
