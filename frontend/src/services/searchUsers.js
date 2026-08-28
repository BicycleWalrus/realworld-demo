import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function searchUsers({ q }) {
  try {
    const { data } = await axios({ params: { q }, url: `api/users/search` });

    return data.users;
  } catch (error) {
    errorHandler(error);
  }
}

export default searchUsers;
