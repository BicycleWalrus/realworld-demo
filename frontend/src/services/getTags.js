import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getTags({ headers } = {}) {
  try {
    const { data } = await axios({ headers, url: "/api/tags" });

    return data.tags;
  } catch (error) {
    errorHandler(error);
  }
}

export default getTags;
