const {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} = require("../helper/customErrors");
const {
  appendFollowers,
  appendFavorites,
  appendReactions,
  appendTagList,
  REACTION_TYPES,
} = require("../helper/helpers");
const { Article, Reaction, Tag, User } = require("../models");

const includeOptions = [
  { model: Tag, as: "tagList", attributes: ["name"] },
  { model: User, as: "author", attributes: { exclude: ["email"] } },
];

//* Set or change a reaction
const setReaction = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { type } = req.body;
    if (!REACTION_TYPES.includes(type)) {
      throw new ValidationError(
        `Reaction type must be one of: ${REACTION_TYPES.join(", ")}`,
      );
    }

    const { slug } = req.params;
    const article = await Article.findOne({
      where: { slug: slug },
      include: includeOptions,
    });
    if (!article) throw new NotFoundError("Article");

    const where = { userId: loggedUser.id, articleId: article.id };
    const [reaction, created] = await Reaction.findOrCreate({
      where,
      defaults: { type },
    });
    if (!created && reaction.type !== type) {
      reaction.type = type;
      await reaction.save();
    }

    appendTagList(article.tagList, article);
    await appendFollowers(loggedUser, article);
    await appendFavorites(loggedUser, article);
    await appendReactions(loggedUser, article);

    res.json({ article });
  } catch (error) {
    next(error);
  }
};

//* Remove a reaction
const removeReaction = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { slug } = req.params;
    const article = await Article.findOne({
      where: { slug: slug },
      include: includeOptions,
    });
    if (!article) throw new NotFoundError("Article");

    await Reaction.destroy({
      where: { userId: loggedUser.id, articleId: article.id },
    });

    appendTagList(article.tagList, article);
    await appendFollowers(loggedUser, article);
    await appendFavorites(loggedUser, article);
    await appendReactions(loggedUser, article);

    res.json({ article });
  } catch (error) {
    next(error);
  }
};

module.exports = { setReaction, removeReaction };
