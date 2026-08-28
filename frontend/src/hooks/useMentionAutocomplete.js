import { useEffect, useRef, useState } from "react";
import searchUsers from "../services/searchUsers";

const ACTIVE_MENTION = /@(\w*)$/;
const DEBOUNCE_MS = 150;

// Detects an in-progress @mention immediately before the cursor as the
// user types, fetching matching usernames for a suggestion list. Reusable
// across the comment-create and comment-edit textareas.
function useMentionAutocomplete() {
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);
  const latestRequest = useRef(0);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const updateQuery = (text, cursor) => {
    const beforeCursor = text.slice(0, cursor);
    const match = beforeCursor.match(ACTIVE_MENTION);

    clearTimeout(debounceRef.current);

    if (!match || match[1].length === 0) {
      setSuggestions([]);
      return;
    }

    const requestId = ++latestRequest.current;

    debounceRef.current = setTimeout(() => {
      searchUsers({ search: match[1] })
        .then((users) => {
          if (requestId === latestRequest.current) setSuggestions(users || []);
        })
        .catch(console.error);
    }, DEBOUNCE_MS);
  };

  const applyMention = (text, cursor, username) => {
    const beforeCursor = text.slice(0, cursor);
    const match = beforeCursor.match(ACTIVE_MENTION);
    if (!match) return { text, cursor };

    const start = match.index;
    const before = text.slice(0, start);
    const after = text.slice(cursor);
    const inserted = `@${username} `;

    setSuggestions([]);

    return { text: `${before}${inserted}${after}`, cursor: before.length + inserted.length };
  };

  return { suggestions, updateQuery, applyMention };
}

export default useMentionAutocomplete;
