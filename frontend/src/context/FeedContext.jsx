import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const FeedContext = createContext();

export function useFeedContext() {
  return useContext(FeedContext);
}

function FeedProvider({ children }) {
  const { isAuth } = useAuth();
  const [{ tabName, tagName, searchTerm, filterTags }, setTab] = useState({
    tabName: isAuth ? "feed" : "global",
    tagName: "",
    searchTerm: "",
    filterTags: [],
  });

  useEffect(() => {
    setTab((tab) => ({ ...tab, tabName: isAuth ? "feed" : "global" }));
  }, [isAuth]);

  const changeTab = async (e, tabName) => {
    const tagName = e.target.innerText.trim();

    // Keeps the search keyword and multi-tag filter applied across tab
    // switches — they compose with the active view (REQ-062/REQ-063)
    // rather than being tied to one view.
    setTab((tab) => ({ ...tab, tabName, tagName }));
  };

  const setSearchTerm = (searchTerm) => setTab((tab) => ({ ...tab, searchTerm }));

  const setFilterTags = (filterTags) => setTab((tab) => ({ ...tab, filterTags }));

  return (
    <FeedContext.Provider
      value={{ changeTab, setFilterTags, setSearchTerm, tabName, tagName, searchTerm, filterTags }}
    >
      {children}
    </FeedContext.Provider>
  );
}

export default FeedProvider;
