function MentionSuggestions({ suggestions, onSelect }) {
  if (suggestions.length === 0) return null;

  return (
    <ul className="mention-suggestions">
      {suggestions.map((username) => (
        <li key={username}>
          <button type="button" onClick={() => onSelect(username)}>
            @{username}
          </button>
        </li>
      ))}
    </ul>
  );
}

export default MentionSuggestions;
