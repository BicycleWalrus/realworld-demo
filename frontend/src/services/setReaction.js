import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// REQ-094: set or change the authenticated user's reaction on an article to
// one of the fixed types. Independent of toggleFav - never touches
// Favorites or the favorite count.
async function setReaction({ slug, type, headers }) {
  try {
    const { data } = await axios({
      headers,
      method: "POST",
      url: `api/articles/${slug}/reactions`,
      data: { reaction: { type } },
    });

    return data.article;
  } catch (error) {
    errorHandler(error);
  }
}

// REQ-094: explicitly remove the authenticated user's reaction from an
// article, leaving them with no reaction on it.
export async function removeReaction({ slug, headers }) {
  try {
    const { data } = await axios({
      headers,
      method: "DELETE",
      url: `api/articles/${slug}/reactions`,
    });

    return data.article;
  } catch (error) {
    errorHandler(error);
  }
}

export default setReaction;
