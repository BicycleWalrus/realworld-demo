const { UnauthorizedError, NotFoundError } = require("../helper/customErrors");
const {
  appendFollowers,
  appendFavorites,
  appendTagList,
} = require("../helper/helpers");
const { Article, Tag, User } = require("../models");

// REQ-086/REQ-088: adding or removing an article from the requesting
// user's private read-later list. This uses the ReadLater join table
// (via the User/Article `readLater`/`readLaterUsers` associations), which
// is entirely separate from Favorites - it does not touch `addUser`/
// `removeUser`/`hasUser`/`countUsers` and so never affects the article's
// public favorite count (REQ-025/REQ-026 unchanged).
const readLaterToggler = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { slug } = req.params;

    const article = await Article.findOne({
      where: { slug: slug },
      include: [
        {
          model: Tag,
          as: "tagList",
          attributes: ["name"],
        },
        {
          model: User,
          as: "author",
          attributes: { exclude: ["email"] },
        },
      ],
    });
    if (!article) throw new NotFoundError("Article");

    if (req.method === "POST") await loggedUser.addReadLater(article);
    if (req.method === "DELETE") await loggedUser.removeReadLater(article);

    appendTagList(article.tagList, article);
    await appendFollowers(loggedUser, article);
    await appendFavorites(loggedUser, article);
    article.dataValues.readLater = await loggedUser.hasReadLater(article);

    res.json({ article });
  } catch (error) {
    next(error);
  }
};

// REQ-087/REQ-088: the requesting user's own saved articles, most-
// recently-added first, paginated. Privacy is enforced by construction -
// the list is always derived from `loggedUser` (via its `readLater`
// association), never from a query parameter naming another user, so
// nothing here can expose another user's saved list.
const readLaterList = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { limit = 3, offset = 0 } = req.query;

    // Ordering by the ReadLater join table's own createdAt (when the save
    // happened) - not the article's createdAt - is what makes this
    // "most-recently-added first". Sequelize's through-table `order`
    // syntax for a string-defined `through` is not reliably portable
    // across versions/dialects, so every saved article is fetched here
    // (unpaginated) and sorted in JS by its `.ReadLater.createdAt` (the
    // through instance Sequelize attaches to each returned row), then
    // paged below.
    const articles = await loggedUser.getReadLater({
      include: [
        { model: Tag, as: "tagList", attributes: ["name"] },
        { model: User, as: "author", attributes: { exclude: ["email"] } },
      ],
    });
    const count = await loggedUser.countReadLater();

    articles.sort(
      (a, b) => new Date(b.ReadLater.createdAt) - new Date(a.ReadLater.createdAt),
    );
    const start = offset * limit;
    const page = articles.slice(start, start + parseInt(limit));

    for (const article of page) {
      const articleTags = await article.getTagList();

      appendTagList(articleTags, article);
      await appendFollowers(loggedUser, article);
      await appendFavorites(loggedUser, article);

      // Avoid leaking the join-table row itself in the response shape.
      delete article.dataValues.ReadLater;
    }

    res.json({ articles: page, articlesCount: count });
  } catch (error) {
    next(error);
  }
};

module.exports = { readLaterToggler, readLaterList };
