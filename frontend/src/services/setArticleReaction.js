import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function setArticleReaction({ headers, slug, type }) {
  try {
    const { data } = await axios({
      data: { reaction: { type } },
      headers,
      method: "PUT",
      url: `api/articles/${slug}/reaction`,
    });

    return data.article;
  } catch (error) {
    errorHandler(error);
  }
}

export default setArticleReaction;
