import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useFeedContext } from "../../context/FeedContext";
import FeedNavLink from "./FeedNavLink";

function FeedToggler() {
  const { isAuth } = useAuth();
  const { search, searchTerm, tabName, tagName } = useFeedContext();
  const [term, setTerm] = useState("");

  // REQ-057: submitting the search input sets an independent "search" feed
  // tab carrying the keyword; REQ-060: a blank/whitespace term falls back
  // to the Global Feed (handled by the `search` action itself).
  const handleSubmit = (e) => {
    e.preventDefault();
    search(term);
  };

  return (
    <div className="feed-toggle">
      <ul className="nav nav-pills outline-active">
        {isAuth && <FeedNavLink name="feed" text="Your Feed" />}

        <FeedNavLink name="global" text="Global Feed" />

        {/* REQ-061: selectable by any visitor, logged in or not - not
            gated behind `isAuth` like the "Your Feed" pill above. */}
        <FeedNavLink name="top" text="Top Articles" />

        {tabName === "tag" && <FeedNavLink icon name="tag" text={tagName} />}

        {tabName === "search" && (
          <li className="nav-item">
            <span className="nav-link active">{searchTerm}</span>
          </li>
        )}
      </ul>

      <form className="search-articles" onSubmit={handleSubmit}>
        <input
          aria-label="Search articles"
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search articles"
          type="search"
          value={term}
        />
        <button type="submit">Search</button>
      </form>
    </div>
  );
}

export default FeedToggler;
