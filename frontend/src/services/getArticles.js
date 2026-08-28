import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// prettier-ignore
async function getArticles({ headers, limit = 3, location, page = 0, searchTerm, tagName, username }) {
  try {
    const url = {
      favorites: `api/articles?favorited=${username}&&limit=${limit}&&offset=${page}`,
      feed: `api/articles/feed?limit=${limit}&&offset=${page}`,
      global: `api/articles?limit=${limit}&&offset=${page}`,
      profile: `api/articles?author=${username}&&limit=${limit}&&offset=${page}`,
      tag: `api/articles?tag=${tagName}&&limit=${limit}&&offset=${page}`,
      trending: `api/articles?sort=trending&&limit=${limit}&&offset=${page}`,
    };

    // Keyword search (REQ-062) composes with whichever listing is active
    // by appending the search param; an empty term adds nothing.
    const withSearch = searchTerm
      ? `${url[location]}&&search=${encodeURIComponent(searchTerm)}`
      : url[location];

    const { data } = await axios({ url: withSearch, headers });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getArticles;
