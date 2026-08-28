import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// REQ-099: mark a single notification read by id, or mark all of the
// authenticated user's notifications read at once. Returns the updated
// unread count.
async function markNotificationsRead({ headers, id, all }) {
  try {
    const { data } = await axios({
      headers,
      method: "POST",
      url: "api/notifications/read",
      data: { id, all },
    });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default markNotificationsRead;
