import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// REQ-089: follow/unfollow a tag. Mirrors toggleReadLater's shape -
// `following` is the *current* state, so DELETE unfollows an already-
// followed tag and POST follows one that isn't followed yet.
async function toggleFollowTag({ name, following, headers }) {
  try {
    const { data } = await axios({
      headers,
      method: following ? "DELETE" : "POST",
      url: `api/tags/${name}/follow`,
    });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default toggleFollowTag;
