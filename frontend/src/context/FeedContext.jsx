import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const FeedContext = createContext();

export function useFeedContext() {
  return useContext(FeedContext);
}

function FeedProvider({ children }) {
  const { isAuth } = useAuth();
  const [{ tabName, tagName, searchTerm }, setTab] = useState({
    tabName: isAuth ? "feed" : "global",
    tagName: "",
    searchTerm: "",
  });
  // REQ-109/REQ-110: a separate, additive selection of tags for the
  // multi-tag AND filter - independent state from tagName/tabName above, so
  // it does not change the existing single-tag pill click (changeTab) at
  // all (REQ-013/REQ-110 unchanged).
  const [selectedTags, setSelectedTags] = useState([]);

  useEffect(() => {
    setTab((tab) => ({ ...tab, tabName: isAuth ? "feed" : "global" }));
  }, [isAuth]);

  const changeTab = async (e, tabName) => {
    const tagName = e.target.innerText.trim();

    setSelectedTags([]);
    setTab({ tabName, tagName, searchTerm: "" });
  };

  // REQ-057/REQ-060: search is its own feed tab, independent of the
  // author/tag/favorited tabs above. A blank/whitespace-only term falls
  // back to the Global Feed (full listing) rather than an empty search.
  const search = (term) => {
    const trimmed = term.trim();

    setSelectedTags([]);
    if (!trimmed) {
      setTab({ tabName: "global", tagName: "", searchTerm: "" });
    } else {
      setTab({ tabName: "search", tagName: "", searchTerm: trimmed });
    }
  };

  // REQ-109: toggles a tag in/out of the multi-tag selection (checkbox
  // affordance on each Popular Tags pill, additive to the existing pill
  // click above). One selected tag views that tag alone (tagName is the
  // string - identical request shape to clicking the pill, REQ-110); two or
  // more selected tags view the AND-filtered set (tagName becomes the
  // array, REQ-109); clearing the selection back to zero returns to the
  // default feed.
  const toggleTag = (name) => {
    setSelectedTags((prev) => {
      const next = prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name];

      if (next.length === 0) {
        setTab({ tabName: isAuth ? "feed" : "global", tagName: "", searchTerm: "" });
      } else {
        setTab({ tabName: "tag", tagName: next.length === 1 ? next[0] : next, searchTerm: "" });
      }

      return next;
    });
  };

  return (
    <FeedContext.Provider
      value={{ changeTab, search, searchTerm, selectedTags, tabName, tagName, toggleTag }}
    >
      {children}
    </FeedContext.Provider>
  );
}

export default FeedProvider;
