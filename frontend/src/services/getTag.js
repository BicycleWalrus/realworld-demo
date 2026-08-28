import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getTag({ headers, name }) {
  try {
    const { data } = await axios({
      headers,
      method: "GET",
      url: `api/tags/${encodeURIComponent(name)}`,
    });

    return data.tag;
  } catch (error) {
    errorHandler(error);
  }
}

export default getTag;
