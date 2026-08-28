const {
  UnauthorizedError,
  NotFoundError,
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

//* Set/Change/Remove Reaction on Article
const reactionToggler = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { slug } = req.params;

    const article = await Article.findOne({
      where: { slug: slug },
      include: [
        { model: Tag, as: "tagList", attributes: ["name"] },
        { model: User, as: "author", attributes: ["username", "bio", "image"] },
      ],
    });
    if (!article) throw new NotFoundError("Article");

    const existing = await Reaction.findOne({
      where: { articleId: article.id, userId: loggedUser.id },
    });

    if (req.method === "POST") {
      const { type } = req.body.reaction || {};
      if (!REACTION_TYPES.includes(type)) {
        throw new ValidationError(
          `Reaction type must be one of: ${REACTION_TYPES.join(", ")}`,
        );
      }

      if (existing) {
        existing.type = type;
        await existing.save();
      } else {
        await Reaction.create({ type, articleId: article.id, userId: loggedUser.id });
      }
    }

    if (req.method === "DELETE" && existing) {
      await existing.destroy();
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

module.exports = { reactionToggler };
