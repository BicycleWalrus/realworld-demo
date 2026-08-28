import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// REQ-082: `parentId` is optional - omitted (undefined) for a top-level
// comment, set to a top-level comment's id when posting a reply to it.
async function postComment({ body, headers, parentId, slug }) {
  try {
    const { data } = await axios({
      data: { comment: { body, parentId } },
      headers,
      method: "POST",
      url: `api/articles/${slug}/comments`,
    });

    return data.comment;
  } catch (error) {
    errorHandler(error);
  }
}

export default postComment;
