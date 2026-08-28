import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// REQ-087: the authenticated user's own saved articles, most-recently-
// added first, paginated. Requires an auth header - the list is private
// to the requesting user (REQ-088).
async function getReadLater({ headers, limit = 3, page = 0 }) {
  try {
    const { data } = await axios({
      headers,
      url: `api/read-later?limit=${limit}&&offset=${page}`,
    });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getReadLater;
