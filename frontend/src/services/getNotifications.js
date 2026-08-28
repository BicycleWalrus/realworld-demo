import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function getNotifications({ headers }) {
  try {
    const { data } = await axios({ headers, url: "api/user/notifications" });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getNotifications;
