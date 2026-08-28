const { FieldRequiredError, NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { appendReactions, REACTION_TYPES } = require("../helper/helpers");
const { Article, Reaction } = require("../models");

// REQ-094/REQ-095/REQ-096: set/change/remove the requesting user's single
// reaction on an article. Reactions are a separate, independent concept
// from Favorites (REQ-025/REQ-026) - a distinct model/table, never
// affecting the favorite relation or its count.
const reactionToggler = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { slug } = req.params;
    const article = await Article.findOne({ where: { slug: slug } });
    if (!article) throw new NotFoundError("Article");

    if (req.method === "POST") {
      const { type } = req.body.reaction || {};
      if (!REACTION_TYPES.includes(type)) {
        throw new FieldRequiredError("A valid reaction type");
      }

      const existing = await Reaction.findOne({
        where: { articleId: article.id, userId: loggedUser.id },
      });

      if (existing) {
        existing.type = type;
        await existing.save();
      } else {
        await Reaction.create({ articleId: article.id, userId: loggedUser.id, type });
      }
    }

    if (req.method === "DELETE") {
      await Reaction.destroy({ where: { articleId: article.id, userId: loggedUser.id } });
    }

    await appendReactions(loggedUser, article);

    res.json({ article });
  } catch (error) {
    next(error);
  }
};

module.exports = { reactionToggler };
