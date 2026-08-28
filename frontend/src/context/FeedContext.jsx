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

    // Keeps the search keyword applied across tab switches — it composes
    // with the active view (REQ-062) rather than being tied to one view.
    setTab((tab) => ({ ...tab, tabName, tagName }));
  };

  const setSearchTerm = (searchTerm) => setTab((tab) => ({ ...tab, searchTerm }));

  return (
    <FeedContext.Provider
      value={{ changeTab, setSearchTerm, tabName, tagName, searchTerm }}
    >
      {children}
    </FeedContext.Provider>
  );
}

export default FeedProvider;
