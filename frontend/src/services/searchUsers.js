import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function searchUsers({ search }) {
  try {
    const { data } = await axios({ url: "api/users", params: { search } });

    return data.users;
  } catch (error) {
    errorHandler(error);
  }
}

export default searchUsers;
