import axios from "axios";
import errorHandler from "../helpers/errorHandler";

// prettier-ignore
async function getArticles({ headers, limit = 3, location, page = 0, filterTags, searchTerm, tagName, username }) {
  try {
    const url = {
      favorites: `api/articles?favorited=${username}&&limit=${limit}&&offset=${page}`,
      feed: `api/articles/feed?limit=${limit}&&offset=${page}`,
      global: `api/articles?limit=${limit}&&offset=${page}`,
      profile: `api/articles?author=${username}&&limit=${limit}&&offset=${page}`,
      tag: `api/articles?limit=${limit}&&offset=${page}`,
      trending: `api/articles?sort=trending&&limit=${limit}&&offset=${page}`,
    };

    // Tag filter (REQ-013/REQ-063): the multi-tag filter takes the tag
    // params when set; otherwise the single tag of an active tag tab is
    // used, exactly as before. Keyword search (REQ-062) composes with
    // whichever listing and tags are active; an empty term adds nothing.
    const tagValues = filterTags?.length ? filterTags : tagName ? [tagName] : [];
    const tagParams = tagValues
      .map((tag) => `&&tag=${encodeURIComponent(tag)}`)
      .join("");
    const searchParams = searchTerm ? `&&search=${encodeURIComponent(searchTerm)}` : "";
    const withFilters = `${url[location]}${tagParams}${searchParams}`;

    const { data } = await axios({ url: withFilters, headers });

    return data;
  } catch (error) {
    errorHandler(error);
  }
}

export default getArticles;
