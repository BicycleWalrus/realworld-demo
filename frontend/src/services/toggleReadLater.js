import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function toggleReadLater({ slug, readLater, headers }) {
  try {
    const { data } = await axios({
      headers,
      method: readLater ? "DELETE" : "POST",
      url: `api/articles/${slug}/read-later`,
    });

    return data.article;
  } catch (error) {
    errorHandler(error);
  }
}

export default toggleReadLater;
