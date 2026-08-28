const {
  NotFoundError,
  UnauthorizedError,
  FieldRequiredError,
  ForbiddenError,
} = require("../helper/customErrors");
const { appendFollowers } = require("../helper/helpers");
const { Article, Comment, User } = require("../models");

//? All Comments for Article
const allComments = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    const { slug } = req.params;

    const article = await Article.findOne({ where: { slug: slug } });
    if (!article) throw new NotFoundError("Article");

    const comments = await article.getComments({
      where: { parentId: null },
      include: [
        { model: User, as: "author", attributes: { exclude: ["email"] } },
        {
          model: Comment,
          as: "replies",
          include: [
            { model: User, as: "author", attributes: { exclude: ["email"] } },
          ],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    for (const comment of comments) {
      await appendFollowers(loggedUser, comment);

      comment.replies.sort((a, b) => a.createdAt - b.createdAt);
      for (const reply of comment.replies) {
        await appendFollowers(loggedUser, reply);
      }
    }

    res.json({ comments });
  } catch (error) {
    next(error);
  }
};

//* Create Comment for Article
const createComment = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { body, parentId } = req.body.comment;
    if (!body) throw new FieldRequiredError("Comment body");

    const { slug } = req.params;
    const article = await Article.findOne({ where: { slug: slug } });
    if (!article) throw new NotFoundError("Article");

    let resolvedParentId = null;
    if (parentId) {
      const parent = await Comment.findByPk(parentId);
      if (!parent || parent.articleId !== article.id) {
        throw new NotFoundError("Comment");
      }

      // Replying to a reply flattens to that reply's own root parent,
      // keeping nesting to exactly one level.
      resolvedParentId = parent.parentId || parent.id;
    }

    const comment = await Comment.create({
      body: body,
      articleId: article.id,
      userId: loggedUser.id,
      parentId: resolvedParentId,
    });

    delete loggedUser.dataValues.token;
    comment.dataValues.author = loggedUser;
    await appendFollowers(loggedUser, loggedUser);

    res.status(201).json({ comment });
  } catch (error) {
    next(error);
  }
};

//* Delete Comment for Article
const deleteComment = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { slug, commentId } = req.params;

    const comment = await Comment.findByPk(commentId);
    if (!comment) throw new NotFoundError("Comment");

    if (loggedUser.id !== comment.userId) {
      throw new ForbiddenError("comment");
    }

    await comment.destroy();

    res.json({ message: { body: ["Comment deleted successfully"] } });
  } catch (error) {
    next(error);
  }
};

module.exports = { allComments, createComment, deleteComment };
