import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getUsers({ limit = 3, page = 0 }) {
  try {
    const { data } = await axios({
      url: `api/users?limit=${limit}&&offset=${page}`,
    });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getUsers;
