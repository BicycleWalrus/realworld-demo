import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getUserDirectory({ page = 0 } = {}) {
  try {
    const { data } = await axios({
      url: `api/users/directory?limit=20&&offset=${page}`,
    });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getUserDirectory;
