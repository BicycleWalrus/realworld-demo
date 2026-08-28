import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function toggleReaction({ headers, remove, slug, type }) {
  try {
    const { data } = await axios({
      data: remove ? undefined : { reaction: { type } },
      headers,
      method: remove ? "DELETE" : "POST",
      url: `api/articles/${slug}/reactions`,
    });

    return data.article;
  } catch (error) {
    errorHandler(error);
  }
}

export default toggleReaction;
