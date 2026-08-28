import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// REQ-086: adding/removing an article from the authenticated user's
// private read-later list. Mirrors toggleFav's shape - `saved` is the
// *current* state, so DELETE removes an already-saved article and POST
// adds one that isn't saved yet.
async function toggleReadLater({ slug, saved, headers }) {
  try {
    const { data } = await axios({
      headers,
      method: saved ? "DELETE" : "POST",
      url: `api/read-later/${slug}`,
    });

    return data.article;
  } catch (error) {
    errorHandler(error);
  }
}

export default toggleReadLater;
