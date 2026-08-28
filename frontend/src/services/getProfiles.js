import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// REQ-074/REQ-075: paginated, unauthenticated directory listing — no
// `headers` needed since the endpoint is readable by anonymous visitors.
async function getProfiles({ limit = 10, page = 0 }) {
  try {
    const { data } = await axios({ url: `api/profiles?limit=${limit}&&offset=${page}` });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getProfiles;
