import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getReadLaterList({ headers }) {
  try {
    const { data } = await axios({ headers, url: "api/read-later" });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getReadLaterList;
