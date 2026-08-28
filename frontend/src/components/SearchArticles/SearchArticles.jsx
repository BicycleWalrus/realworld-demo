import { useState } from "react";
import { useFeedContext } from "../../context/FeedContext";

function SearchArticles() {
  const { changeSearch } = useFeedContext();
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    changeSearch(value);
  };

  return (
    <form className="search-articles" onSubmit={handleSubmit}>
      <input
        aria-label="Search articles"
        className="form-control"
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search articles..."
        type="text"
        value={value}
      />
      <button aria-label="Search" className="btn btn-primary" type="submit">
        <i className="ion-search"></i>
      </button>
    </form>
  );
}

export default SearchArticles;
