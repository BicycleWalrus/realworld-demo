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

    setTab((tab) => ({ ...tab, tabName, tagName }));
  };

  const changeSearch = (searchTerm) => {
    setTab((tab) => ({ ...tab, tabName: "search", searchTerm }));
  };

  return (
    <FeedContext.Provider
      value={{ changeSearch, changeTab, searchTerm, tabName, tagName }}
    >
      {children}
    </FeedContext.Provider>
  );
}

export default FeedProvider;
