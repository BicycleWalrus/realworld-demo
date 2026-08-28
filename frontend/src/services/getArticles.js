import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// prettier-ignore
async function getArticles({ headers, limit = 3, location, page = 0, searchTerm, tagName, username }) {
  try {
    // REQ-109/REQ-110: tagName is a single string for the existing one-tag
    // case (unchanged URL below) or an array for two-or-more tags, in which
    // case each tag is sent as a repeated `tag=` param (Express parses that
    // into an array server-side).
    const tagQuery = Array.isArray(tagName)
      ? tagName.map((name) => `tag=${name}`).join("&&")
      : `tag=${tagName}`;
    const url = {
      favorites: `api/articles?favorited=${username}&&limit=${limit}&&offset=${page}`,
      feed: `api/articles/feed?limit=${limit}&&offset=${page}`,
      global: `api/articles?limit=${limit}&&offset=${page}`,
      profile: `api/articles?author=${username}&&limit=${limit}&&offset=${page}`,
      search: `api/articles?search=${encodeURIComponent(searchTerm)}&&limit=${limit}&&offset=${page}`,
      tag: `api/articles?${tagQuery}&&limit=${limit}&&offset=${page}`,
      top: `api/articles?sort=top&&limit=${limit}&&offset=${page}`,
    };

    const { data } = await axios({ url: url[location], headers });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getArticles;
