import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// REQ-098: the authenticated user's own notifications, newest first, plus
// the current unread count for an at-a-glance badge (REQ-099).
async function getNotifications({ headers }) {
  try {
    const { data } = await axios({ headers, url: "api/notifications" });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getNotifications;
