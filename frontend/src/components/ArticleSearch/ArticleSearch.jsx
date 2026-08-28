import { useState } from "react";
import { useFeedContext } from "../../context/FeedContext";

function ArticleSearch() {
  const { searchTerm, setSearchTerm } = useFeedContext();
  const [inputValue, setInputValue] = useState(searchTerm);

  const handleSubmit = (event) => {
    event.preventDefault();
    setSearchTerm(inputValue.trim());
  };

  const handleClear = () => {
    setInputValue("");
    setSearchTerm("");
  };

  return (
    <div className="article-search">
      <form onSubmit={handleSubmit}>
        <input
          aria-label="Search articles by keyword"
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Search articles by keyword"
          type="search"
          value={inputValue}
        />
        <button type="submit">Search</button>
        {searchTerm !== "" && (
          <button onClick={handleClear} type="button">
            Clear
          </button>
        )}
      </form>
    </div>
  );
}

export default ArticleSearch;
