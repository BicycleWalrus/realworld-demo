import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function toggleReadLater({ headers, readLater, slug }) {
  try {
    const { data } = await axios({
      headers,
      method: readLater ? "DELETE" : "POST",
      url: `api/articles/${slug}/readlater`,
    });

    return data.article;
  } catch (error) {
    errorHandler(error);
  }
}

export default toggleReadLater;
