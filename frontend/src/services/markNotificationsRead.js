import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function markNotificationsRead({ headers, id }) {
  try {
    const { data } = await axios({
      data: { id },
      headers,
      method: "PATCH",
      url: "api/user/notifications/read",
    });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default markNotificationsRead;
