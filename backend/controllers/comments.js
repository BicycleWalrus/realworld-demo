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
      include: [
        { model: User, as: "author", attributes: { exclude: ["email"] } },
      ],
    });

    // Threaded replies (REQ-064): top-level comments are returned as
    // before, each now carrying its replies (newest-last, same order
    // they arrive in) nested under it. A comment with no parent is
    // unaffected by this grouping.
    const repliesByParentId = new Map();
    const topLevel = [];
    for (const comment of comments) {
      await appendFollowers(loggedUser, comment);

      if (comment.parentCommentId) {
        const replies = repliesByParentId.get(comment.parentCommentId) ?? [];
        replies.push(comment);
        repliesByParentId.set(comment.parentCommentId, replies);
      } else {
        topLevel.push(comment);
      }
    }
    for (const parent of topLevel) {
      parent.dataValues.replies = repliesByParentId.get(parent.id) ?? [];
    }

    res.json({ comments: topLevel });
  } catch (error) {
    next(error);
  }
};

//* Create Comment for Article
const createComment = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { body, parentCommentId } = req.body.comment;
    if (!body) throw new FieldRequiredError("Comment body");

    const { slug } = req.params;
    const article = await Article.findOne({ where: { slug: slug } });
    if (!article) throw new NotFoundError("Article");

    // A reply must attach to a comment on the same article. Nesting is
    // one level deep (REQ-064): replying to a reply attaches under the
    // same top-level parent rather than nesting deeper.
    let parentCommentIdToCreate;
    if (parentCommentId !== undefined && parentCommentId !== null) {
      const parent = await Comment.findByPk(parentCommentId);
      if (!parent || parent.articleId !== article.id) {
        throw new NotFoundError("Parent comment");
      }
      parentCommentIdToCreate = parent.parentCommentId ?? parent.id;
    }

    const comment = await Comment.create({
      body: body,
      articleId: article.id,
      userId: loggedUser.id,
      ...(parentCommentIdToCreate && { parentCommentId: parentCommentIdToCreate }),
    });

    delete loggedUser.dataValues.token;
    comment.dataValues.author = loggedUser;
    comment.dataValues.replies = [];
    await appendFollowers(loggedUser, loggedUser);

    res.status(201).json({ comment });
  } catch (error) {
    next(error);
  }
};

//* Update Comment for Article
const updateComment = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { commentId } = req.params;

    const comment = await Comment.findByPk(commentId, {
      include: [
        { model: User, as: "author", attributes: { exclude: ["email"] } },
      ],
    });
    if (!comment) throw new NotFoundError("Comment");

    if (loggedUser.id !== comment.userId) {
      throw new ForbiddenError("comment");
    }

    const { body } = req.body.comment;
    if (!body) throw new FieldRequiredError("Comment body");

    comment.body = body;
    await comment.save();

    await appendFollowers(loggedUser, comment.author);

    res.json({ comment });
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

module.exports = {
  allComments,
  createComment,
  updateComment,
  deleteComment,
};
