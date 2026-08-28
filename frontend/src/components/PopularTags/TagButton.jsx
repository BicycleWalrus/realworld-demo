import { useAuth } from "../../context/AuthContext";
import { useFeedContext } from "../../context/FeedContext";
import toggleTagFollow from "../../services/toggleTagFollow";

function TagButton({ tagsList, updateTags }) {
  const { changeTab } = useFeedContext();
  const { headers, isAuth } = useAuth();

  const handleClick = (e) => {
    changeTab(e, "tag");
  };

  const handleFollowClick = (tag) => {
    if (!isAuth) return alert("You need to login first");

    toggleTagFollow({ followed: tag.followed, headers, name: tag.name })
      .then((updatedTag) => {
        updateTags((tags) =>
          tags.map((t) => (t.name === updatedTag.name ? updatedTag : t)),
        );
      })
      .catch(console.error);
  };

  return tagsList.slice(0, 50).map((tag) => (
    <span className="tag-pill-wrapper" key={tag.name}>
      <button className="tag-pill tag-default" onClick={handleClick}>
        {tag.name}
      </button>
      <button
        className="tag-follow-btn btn-link"
        onClick={() => handleFollowClick(tag)}
      >
        <i className={tag.followed ? "ion-minus-round" : "ion-plus-round"}></i>
      </button>
    </span>
  ));
}

export default TagButton;
