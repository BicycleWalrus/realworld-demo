import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function toggleTagFollow({ followed, headers, name }) {
  try {
    const { data } = await axios({
      headers,
      method: followed ? "DELETE" : "POST",
      url: `api/tags/${name}/follow`,
    });

    return data.tag;
  } catch (error) {
    errorHandler(error);
  }
}

export default toggleTagFollow;
