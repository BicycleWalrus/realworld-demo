import axios from "axios";
import errorHandler from "../helpers/errorHandler";

async function setArticle({ body, description, draft, headers, image, slug, tagList, title }) {
  try {
    const { data } = await axios({
      // draft (REQ-067) rides along when present: absent on ordinary
      // updates, true/false when saving or publishing a draft.
      data: {
        article: { title, description, body, image, tagList, ...(draft !== undefined && { draft }) },
      },
      headers,
      method: slug ? "PUT" : "POST",
      url: slug ? `api/articles/${slug}` : "api/articles",
    });

    return data.article.slug;
  } catch (error) {
    errorHandler(error);
  }
}

export default setArticle;
