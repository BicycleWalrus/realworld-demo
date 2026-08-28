import { useState } from "react";
import { useFeedContext } from "../../context/FeedContext";

function SearchBox() {
  const { keyword, search } = useFeedContext();
  const [value, setValue] = useState(keyword || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    search(value);
  };

  return (
    <form className="search-box" onSubmit={handleSubmit}>
      <input
        className="form-control"
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search articles..."
        type="search"
        value={value}
      />
    </form>
  );
}

export default SearchBox;
