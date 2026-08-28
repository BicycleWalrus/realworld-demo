import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function toggleReadLater({ slug, isSaved, headers }) {
  try {
    const { data } = await axios({
      headers,
      method: isSaved ? "DELETE" : "POST",
      url: `api/articles/${slug}/read-later`,
    });

    return data.article;
  } catch (error) {
    errorHandler(error);
  }
}

export default toggleReadLater;
