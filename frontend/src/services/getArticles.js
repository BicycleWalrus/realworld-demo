import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// prettier-ignore
async function getArticles({ headers, keyword, limit = 3, location, page = 0, tagName, username }) {
  try {
    const url = {
      favorites: `api/articles?favorited=${encodeURIComponent(username)}&&limit=${limit}&&offset=${page}`,
      feed: `api/articles/feed?limit=${limit}&&offset=${page}`,
      global: `api/articles?limit=${limit}&&offset=${page}`,
      profile: `api/articles?author=${encodeURIComponent(username)}&&limit=${limit}&&offset=${page}`,
      search: `api/articles?keyword=${encodeURIComponent(keyword)}&&limit=${limit}&&offset=${page}`,
      tag: `api/articles?tag=${encodeURIComponent(tagName)}&&limit=${limit}&&offset=${page}`,
    };

    const { data } = await axios({ url: url[location], headers });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getArticles;
