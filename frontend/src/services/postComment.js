import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function postComment({ body, headers, parentCommentId, slug }) {
  try {
    const { data } = await axios({
      data: {
        comment: {
          body,
          ...(parentCommentId && { parentCommentId }),
        },
      },
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
