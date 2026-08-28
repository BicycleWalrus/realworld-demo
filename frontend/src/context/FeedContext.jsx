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

  useEffect(() => {
    setTab((tab) => ({ ...tab, tabName: isAuth ? "feed" : "global" }));
  }, [isAuth]);

  const changeTab = async (e, tabName) => {
    const tagName = e.target.innerText.trim();

    setTab({ tabName, tagName, searchTerm: "" });
  };

  // REQ-057/REQ-060: search is its own feed tab, independent of the
  // author/tag/favorited tabs above. A blank/whitespace-only term falls
  // back to the Global Feed (full listing) rather than an empty search.
  const search = (term) => {
    const trimmed = term.trim();

    if (!trimmed) {
      setTab({ tabName: "global", tagName: "", searchTerm: "" });
    } else {
      setTab({ tabName: "search", tagName: "", searchTerm: trimmed });
    }
  };

  return (
    <FeedContext.Provider
      value={{ changeTab, search, searchTerm, tabName, tagName }}
    >
      {children}
    </FeedContext.Provider>
  );
}

export default FeedProvider;
