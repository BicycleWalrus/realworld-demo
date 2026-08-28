import { useState } from "react";
import { useFeedContext } from "../../context/FeedContext";

function ArticleSearch() {
  const { keyword, setKeyword, tabName, tagName } = useFeedContext();
  const [input, setInput] = useState(keyword);

  const handleSubmit = (e) => {
    e.preventDefault();

    setKeyword(input.trim());
  };

  const handleClear = () => {
    setInput("");
    setKeyword("");
  };

  const activeTagName = tabName === "tag" ? tagName : "";

  return (
    <div className="article-search">
      <form className="article-search-form" onSubmit={handleSubmit}>
        <input
          className="form-control"
          onChange={(e) => setInput(e.target.value)}
          placeholder="Search articles..."
          type="search"
          value={input}
        />
        <button className="btn btn-sm btn-primary" type="submit">
          Search
        </button>
      </form>

      {keyword && (
        <p className="article-search-active">
          Showing results for &quot;{keyword}&quot;
          {activeTagName && (
            <>
              {" "}
              tagged <strong>#{activeTagName}</strong>
            </>
          )}
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={handleClear}
            type="button"
          >
            Clear search
          </button>
        </p>
      )}
    </div>
  );
}

export default ArticleSearch;
