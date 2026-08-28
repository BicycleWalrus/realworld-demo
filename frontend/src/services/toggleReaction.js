import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// A falsy `type` removes the current reaction; otherwise sets/changes it.
async function toggleReaction({ slug, type, headers }) {
  try {
    const { data } = await axios({
      headers,
      method: type ? "PUT" : "DELETE",
      url: `api/articles/${slug}/reactions`,
      ...(type && { data: { type } }),
    });

    return data.article;
  } catch (error) {
    errorHandler(error);
  }
}

export default toggleReaction;
