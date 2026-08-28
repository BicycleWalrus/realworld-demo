import { useFeedContext } from "../../context/FeedContext";

// REQ-089: an authenticated user can follow/unfollow a tag from the
// Popular Tags list, additive to the existing tag-pill click (which still
// filters the feed to that tag via changeTab, REQ-020/REQ-021 UI). The
// follow control is a sibling of the pill, not nested inside it, so
// clicking it doesn't also trigger the pill's changeTab handler.
//
// REQ-109/REQ-110: a checkbox is a second sibling control that adds/removes
// the tag from a separate multi-tag selection (toggleTag), letting a user
// build an AND filter across 2+ tags without touching the pill's own click
// behavior (still a single-tag changeTab call, unchanged).
function TagButton({ tagsList, isAuth = false, followed = new Set(), onToggleFollow }) {
  const { changeTab, selectedTags, toggleTag } = useFeedContext();

  const handleClick = (e) => {
    changeTab(e, "tag");
  };

  const handleFollowClick = (e, name) => {
    e.stopPropagation();
    onToggleFollow(name);
  };

  return tagsList.slice(0, 50).map((name) => {
    const isFollowed = followed.has(name);
    const isSelected = selectedTags.includes(name);

    return (
      <span className="tag-pill-wrapper" key={name}>
        <input
          type="checkbox"
          className="tag-filter-checkbox"
          aria-label={`Add ${name} to tag filter`}
          checked={isSelected}
          onChange={() => toggleTag(name)}
        />
        <button className="tag-pill tag-default" onClick={handleClick}>
          {name}
        </button>
        {isAuth && (
          <button
            type="button"
            className={`tag-follow-btn ${isFollowed ? "following" : ""}`}
            aria-label={isFollowed ? `Unfollow ${name}` : `Follow ${name}`}
            onClick={(e) => handleFollowClick(e, name)}
          >
            {isFollowed ? "✓" : "+"}
          </button>
        )}
      </span>
    );
  });
}

export default TagButton;
