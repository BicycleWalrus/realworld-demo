import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function verifyUsernames(usernames) {
  try {
    const { data } = await axios({
      url: "api/users/verify",
      params: { usernames: usernames.join(",") },
    });

    return data.users;
  } catch (error) {
    errorHandler(error);
  }
}

export default verifyUsernames;
