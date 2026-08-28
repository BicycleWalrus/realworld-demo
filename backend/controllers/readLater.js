const { UnauthorizedError, NotFoundError } = require("../helper/customErrors");
const { Article, Tag, User, sequelize } = require("../models");

//* Save/Un-save an article for later
const readLaterToggler = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { slug } = req.params;

    const article = await Article.findOne({ where: { slug } });
    if (!article) throw new NotFoundError("Article");

    if (req.method === "POST") await article.addSavedByUser(loggedUser);
    if (req.method === "DELETE") await article.removeSavedByUser(loggedUser);

    const isSaved = await article.hasSavedByUser(loggedUser);

    res.json({ article: { slug: article.slug, isSaved } });
  } catch (error) {
    next(error);
  }
};

//* List the current user's read-later articles, most recently saved first
const readLaterList = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const savedRows = await sequelize.models.ReadLater.findAll({
      where: { userId: loggedUser.id },
      order: [["createdAt", "DESC"]],
    });
    const articleIds = savedRows.map((row) => row.articleId);

    const articles = await Article.findAll({
      where: { id: articleIds },
      include: [
        { model: Tag, as: "tagList", attributes: ["name"] },
        { model: User, as: "author", attributes: ["username", "bio", "image"] },
      ],
    });
    const articlesById = new Map(articles.map((article) => [article.id, article]));
    const orderedArticles = articleIds.map((id) => articlesById.get(id));

    res.json({ articles: orderedArticles, articlesCount: orderedArticles.length });
  } catch (error) {
    next(error);
  }
};

module.exports = { readLaterToggler, readLaterList };
