import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// REQ-089: the authenticated user's own followed tag names. Requires an
// auth header - the list is private to the requesting user.
async function getFollowedTags({ headers }) {
  try {
    const { data } = await axios({ headers, url: "api/tags/followed" });

    return data.tags;
  } catch (error) {
    errorHandler(error);
  }
}

export default getFollowedTags;
