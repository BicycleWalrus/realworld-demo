import { useState } from "react";
import { useFeedContext } from "../../context/FeedContext";

function TagFilterInput() {
  const { filterTags, setFilterTags } = useFeedContext();
  const [inputValue, setInputValue] = useState(filterTags.join(", "));

  const handleSubmit = (event) => {
    event.preventDefault();
    setFilterTags(
      inputValue
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    );
  };

  const handleClear = () => {
    setInputValue("");
    setFilterTags([]);
  };

  return (
    <div className="tag-filter">
      <form onSubmit={handleSubmit}>
        <input
          aria-label="Filter articles by tags"
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Filter by tags (comma-separated)"
          type="text"
          value={inputValue}
        />
        <button type="submit">Filter</button>
        {filterTags.length > 0 && (
          <button onClick={handleClear} type="button">
            Clear
          </button>
        )}
      </form>
    </div>
  );
}

export default TagFilterInput;
