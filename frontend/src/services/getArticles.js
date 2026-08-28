import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// prettier-ignore
async function getArticles({ headers, limit = 3, location, page = 0, tagName, tagNames, username }) {
  try {
    // A single tag keeps the exact same query shape as before; more than
    // one sends `tag` repeated, which the backend collects into an array
    // for the multi-tag AND filter.
    const tagQuery =
      tagNames?.length > 1
        ? tagNames.map((name) => `tag=${encodeURIComponent(name)}`).join("&&")
        : `tag=${tagName}`;

    const url = {
      favorites: `api/articles?favorited=${username}&&limit=${limit}&&offset=${page}`,
      feed: `api/articles/feed?limit=${limit}&&offset=${page}`,
      global: `api/articles?limit=${limit}&&offset=${page}`,
      profile: `api/articles?author=${username}&&limit=${limit}&&offset=${page}`,
      tag: `api/articles?${tagQuery}&&limit=${limit}&&offset=${page}`,
    };

    const { data } = await axios({ url: url[location], headers });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getArticles;
