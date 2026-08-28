const {
  FieldRequiredError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} = require("../helper/customErrors");
const {
  appendFavorites,
  appendFollowers,
  appendReactions,
  appendTagList,
  REACTION_TYPES,
} = require("../helper/helpers");
const { Article, Tag, User, sequelize } = require("../models");

//? Set (or change) the logged-in user's reaction on an article (REQ-066)
const setReaction = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { slug } = req.params;
    const article = await Article.findOne({
      where: { slug: slug },
      include: [
        { model: Tag, as: "tagList", attributes: ["name"] },
        { model: User, as: "author", attributes: { exclude: ["email"] } },
      ],
    });
    if (!article) throw new NotFoundError("Article");

    const type = req.body?.reaction?.type;
    if (!type) throw new FieldRequiredError("A reaction type");
    if (!REACTION_TYPES.includes(type)) {
      throw new ValidationError(
        `A reaction type must be one of: ${REACTION_TYPES.join(", ")}`,
      );
    }

    const Reactions = sequelize.models.Reactions;
    const existing = await Reactions.findOne({
      where: { articleId: article.id, userId: loggedUser.id },
    });
    if (existing) {
      await existing.update({ type });
    } else {
      await Reactions.create({ articleId: article.id, userId: loggedUser.id, type });
    }

    appendTagList(article.tagList, article);
    await appendFollowers(loggedUser, article);
    await appendFavorites(loggedUser, article);
    await appendReactions(loggedUser, article, sequelize);

    res.json({ article });
  } catch (error) {
    next(error);
  }
};

//? Remove the logged-in user's reaction from an article (REQ-066)
const removeReaction = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { slug } = req.params;
    const article = await Article.findOne({
      where: { slug: slug },
      include: [
        { model: Tag, as: "tagList", attributes: ["name"] },
        { model: User, as: "author", attributes: { exclude: ["email"] } },
      ],
    });
    if (!article) throw new NotFoundError("Article");

    const Reactions = sequelize.models.Reactions;
    const existing = await Reactions.findOne({
      where: { articleId: article.id, userId: loggedUser.id },
    });
    if (existing) await existing.destroy();

    appendTagList(article.tagList, article);
    await appendFollowers(loggedUser, article);
    await appendFavorites(loggedUser, article);
    await appendReactions(loggedUser, article, sequelize);

    res.json({ article });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  setReaction,
  removeReaction,
};
