import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getReadingList({ headers, limit = 3, page = 0 }) {
  try {
    const { data } = await axios({
      headers,
      url: `api/user/readlater?limit=${limit}&&offset=${page}`,
    });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getReadingList;
