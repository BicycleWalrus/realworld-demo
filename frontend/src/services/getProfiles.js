import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getProfiles({ headers, limit = 12, page = 0 }) {
  try {
    const { data } = await axios({ headers, url: `api/profiles?limit=${limit}&&offset=${page}` });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getProfiles;
