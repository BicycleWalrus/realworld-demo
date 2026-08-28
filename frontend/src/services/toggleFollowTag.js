import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function toggleFollowTag({ follow, headers, name }) {
  try {
    const { data } = await axios({
      headers,
      method: follow ? "POST" : "DELETE",
      url: `api/tags/${encodeURIComponent(name)}/follow`,
    });

    return data.tag;
  } catch (error) {
    errorHandler(error);
  }
}

export default toggleFollowTag;
