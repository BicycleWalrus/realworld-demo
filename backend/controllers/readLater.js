const { UnauthorizedError, NotFoundError } = require("../helper/customErrors");
const {
  appendFollowers,
  appendFavorites,
  appendReadLater,
  appendTagList,
} = require("../helper/helpers");
const { Article, ReadLater, Tag, User } = require("../models");

const includeOptions = [
  { model: Tag, as: "tagList", attributes: ["name"] },
  { model: User, as: "author", attributes: { exclude: ["email"] } },
];

//* Save/Unsave Article for later
const readLaterToggler = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { slug } = req.params;
    const article = await Article.findOne({
      where: { slug: slug },
      include: includeOptions,
    });
    if (!article) throw new NotFoundError("Article");

    const where = { userId: loggedUser.id, articleId: article.id };
    if (req.method === "POST") {
      await ReadLater.findOrCreate({ where });
    } else if (req.method === "DELETE") {
      await ReadLater.destroy({ where });
    }

    appendTagList(article.tagList, article);
    await appendFollowers(loggedUser, article);
    await appendFavorites(loggedUser, article);
    appendReadLater(article, req.method === "POST");

    res.json({ article });
  } catch (error) {
    next(error);
  }
};

//? Current user's read-later list
const readLaterList = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { limit = 3, offset = 0 } = req.query;
    const { rows, count } = await ReadLater.findAndCountAll({
      where: { userId: loggedUser.id },
      include: [{ model: Article, include: includeOptions }],
      limit: parseInt(limit),
      offset: offset * limit,
      order: [["createdAt", "DESC"]],
    });

    const articles = rows.map((row) => row.Article);
    for (const article of articles) {
      const articleTags = await article.getTagList();

      appendTagList(articleTags, article);
      await appendFollowers(loggedUser, article);
      await appendFavorites(loggedUser, article);
      appendReadLater(article, true);
    }

    res.json({ articles, articlesCount: count });
  } catch (error) {
    next(error);
  }
};

module.exports = { readLaterToggler, readLaterList };
