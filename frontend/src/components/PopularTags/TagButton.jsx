import { useFeedContext } from "../../context/FeedContext";

// REQ-089: an authenticated user can follow/unfollow a tag from the
// Popular Tags list, additive to the existing tag-pill click (which still
// filters the feed to that tag via changeTab, REQ-020/REQ-021 UI). The
// follow control is a sibling of the pill, not nested inside it, so
// clicking it doesn't also trigger the pill's changeTab handler.
function TagButton({ tagsList, isAuth = false, followed = new Set(), onToggleFollow }) {
  const { changeTab } = useFeedContext();

  const handleClick = (e) => {
    changeTab(e, "tag");
  };

  const handleFollowClick = (e, name) => {
    e.stopPropagation();
    onToggleFollow(name);
  };

  return tagsList.slice(0, 50).map((name) => {
    const isFollowed = followed.has(name);

    return (
      <span className="tag-pill-wrapper" key={name}>
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
