import { useFeedContext } from "../../context/FeedContext";

function TagButton({ tagsList }) {
  const { changeTab, tagNames, toggleTag } = useFeedContext();

  // A plain click replaces the filter with just this tag, exactly as
  // before. Shift-click instead adds/removes this tag from a multi-tag
  // AND filter, without disturbing plain-click behavior.
  const handleClick = (e) => {
    if (e.shiftKey) {
      toggleTag(e.target.innerText.trim());
    } else {
      changeTab(e, "tag");
    }
  };

  return tagsList.slice(0, 50).map((name) => (
    <button
      className={`tag-pill tag-default ${tagNames.includes(name) ? "active" : ""}`}
      key={name}
      onClick={handleClick}
    >
      {name}
    </button>
  ));
}

export default TagButton;
