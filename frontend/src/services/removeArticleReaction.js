import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function removeArticleReaction({ headers, slug }) {
  try {
    const { data } = await axios({
      headers,
      method: "DELETE",
      url: `api/articles/${slug}/reaction`,
    });

    return data.article;
  } catch (error) {
    errorHandler(error);
  }
}

export default removeArticleReaction;
