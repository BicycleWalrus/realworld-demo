import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function markNotificationsRead({ all, headers, id }) {
  try {
    const { data } = await axios({
      data: { all, id },
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
