import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

const FeedContext = createContext();

export function useFeedContext() {
  return useContext(FeedContext);
}

function FeedProvider({ children }) {
  const { isAuth } = useAuth();
  const [{ tabName, tagName, tagNames }, setTab] = useState({
    tabName: isAuth ? "feed" : "global",
    tagName: "",
    tagNames: [],
  });

  useEffect(() => {
    setTab((tab) => ({ ...tab, tabName: isAuth ? "feed" : "global" }));
  }, [isAuth]);

  const changeTab = async (e, tabName) => {
    const tagName = e.target.innerText.trim();

    setTab({ tabName, tagName, tagNames: tabName === "tag" ? [tagName] : [] });
  };

  // Shift-clicking a tag pill (TagButton) adds/removes it from a
  // multi-tag AND filter, distinct from a plain click (changeTab above),
  // which continues to replace with a single tag exactly as before.
  const toggleTag = (name) => {
    setTab((tab) => {
      const tagNames = tab.tagNames.includes(name)
        ? tab.tagNames.filter((n) => n !== name)
        : [...tab.tagNames, name];

      return { ...tab, tabName: "tag", tagNames };
    });
  };

  return (
    <FeedContext.Provider
      value={{ changeTab, tabName, tagName, tagNames, toggleTag }}
    >
      {children}
    </FeedContext.Provider>
  );
}

export default FeedProvider;
