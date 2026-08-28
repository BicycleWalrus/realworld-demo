import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const FeedContext = createContext();

export function useFeedContext() {
  return useContext(FeedContext);
}

function FeedProvider({ children }) {
  const { isAuth } = useAuth();
  const [{ tabName, tagName, keyword }, setTab] = useState({
    tabName: isAuth ? "feed" : "global",
    tagName: "",
    keyword: "",
  });

  useEffect(() => {
    setTab((tab) => ({ ...tab, tabName: isAuth ? "feed" : "global" }));
  }, [isAuth]);

  const changeTab = async (e, tabName) => {
    const tagName = e.target.innerText.trim();

    setTab({ tabName, tagName, keyword: "" });
  };

  const search = (keyword) => {
    setTab({ tabName: "search", tagName: "", keyword });
  };

  return (
    <FeedContext.Provider value={{ changeTab, keyword, search, tabName, tagName }}>
      {children}
    </FeedContext.Provider>
  );
}

export default FeedProvider;
