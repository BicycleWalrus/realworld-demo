import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// REQ-074/REQ-075: paginated, unauthenticated directory listing — no
// `headers` needed since the endpoint is readable by anonymous visitors.
// REQ-079: an optional `username` prefix filter is reused by comment
// @mention autocomplete; omitting it (the Directory page's usage) leaves
// this call's existing behavior unchanged.
async function getProfiles({ limit = 10, page = 0, username } = {}) {
  try {
    const usernameParam = username ? `&username=${encodeURIComponent(username)}` : "";
    const { data } = await axios({
      url: `api/profiles?limit=${limit}&&offset=${page}${usernameParam}`,
    });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getProfiles;
