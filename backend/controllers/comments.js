const {
  NotFoundError,
  UnauthorizedError,
  FieldRequiredError,
  ForbiddenError,
} = require("../helper/customErrors");
const { appendFollowers } = require("../helper/helpers");
const { Article, Comment, User } = require("../models");

// REQ-080/REQ-081: extract the unique `@username`-shaped tokens (without the
// leading `@`) from a comment body. Does not check whether any of them
// correspond to a real user - that happens in allComments, which is what
// distinguishes a valid mention (REQ-080) from a plain-text one (REQ-081).
const extractMentionTokens = (body) => {
  const matches = body.match(/@(\w+)/g) || [];
  return [...new Set(matches.map((token) => token.slice(1)))];
};

// REQ-083/REQ-080/REQ-081: shared per-comment enrichment - attaches
// REQ-018-style follower info for the comment's author, and resolves
// @mentions (REQ-080/REQ-081). Applied to both top-level comments and
// their replies (REQ-083) so the two render identically in this respect.
const enrichComment = async (loggedUser, comment) => {
  await appendFollowers(loggedUser, comment);

  const tokens = extractMentionTokens(comment.body);
  if (tokens.length) {
    const users = await User.findAll({
      where: { username: tokens },
      attributes: ["username"],
    });
    comment.dataValues.mentions = users.map((u) => u.username);
  } else {
    comment.dataValues.mentions = [];
  }
};

//? All Comments for Article
const allComments = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    const { slug } = req.params;

    const article = await Article.findOne({ where: { slug: slug } });
    if (!article) throw new NotFoundError("Article");

    // REQ-083: only top-level comments (parentId null) are returned at the
    // top level; each carries its own replies nested underneath.
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
          separate: true,
          order: [["createdAt", "ASC"]],
        },
      ],
    });

    for (const comment of comments) {
      await enrichComment(loggedUser, comment);

      const replies = comment.dataValues.replies || [];
      for (const reply of replies) {
        await enrichComment(loggedUser, reply);
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

    // REQ-082: a reply must target an existing top-level comment on this
    // same article - one level of nesting only, so replying to a reply
    // (the target comment already has its own parentId) is rejected.
    if (parentId) {
      const parent = await Comment.findByPk(parentId);
      if (!parent) throw new NotFoundError("Parent comment");
      if (parent.articleId !== article.id) throw new NotFoundError("Parent comment");
      if (parent.parentId) throw new ForbiddenError("reply");
    }

    const comment = await Comment.create({
      body: body,
      articleId: article.id,
      userId: loggedUser.id,
      parentId: parentId || undefined,
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

//* Update Comment for Article
// REQ-065 / REQ-066: only the comment's author may edit it (mirrors
// deleteComment's ownership check, REQ-023), and a non-empty body is
// required (mirrors createComment's validation, REQ-022).
const updateComment = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { slug, commentId } = req.params;

    const comment = await Comment.findByPk(commentId);
    if (!comment) throw new NotFoundError("Comment");

    if (loggedUser.id !== comment.userId) {
      throw new ForbiddenError("comment");
    }

    const { body } = req.body.comment;
    if (!body) throw new FieldRequiredError("Comment body");

    comment.body = body;
    await comment.save();

    delete loggedUser.dataValues.token;
    comment.dataValues.author = loggedUser;
    await appendFollowers(loggedUser, loggedUser);

    res.json({ comment });
  } catch (error) {
    next(error);
  }
};

module.exports = { allComments, createComment, deleteComment, updateComment };
