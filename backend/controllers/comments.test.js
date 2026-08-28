const {
  FieldRequiredError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn() };
const Comment = { create: vi.fn(), findByPk: vi.fn() };
mockRequire(require.resolve("../models"), { Article, Comment, User: {} });

const { allComments, createComment, deleteComment } = require("./comments");

function makeFollowableUser(overrides = {}) {
  return makeInstance(
    { id: 1, username: "jane", ...overrides },
    { hasFollower: vi.fn().mockResolvedValue(false), countFollowers: vi.fn().mockResolvedValue(0) },
  );
}

function makeCommentWithAuthor(author, { replies = [] } = {}) {
  return makeInstance(
    { id: 1, body: "hi", replies },
    { author, getAuthor: vi.fn().mockResolvedValue(author) },
  );
}

beforeEach(() => {
  Article.findOne.mockReset();
  Comment.create.mockReset();
  Comment.findByPk.mockReset();
});

describe("allComments", () => {
  // AC-004 / AC-044: comment listing does not require authentication.
  test("no loggedUser -> comments are still returned", async () => {
    const author = makeFollowableUser();
    const comment = makeCommentWithAuthor(author);
    const article = makeInstance({}, { getComments: vi.fn().mockResolvedValue([comment]) });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await allComments({ loggedUser: undefined, params: { slug: "a-slug" } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ comments: [comment] });
    expect(comment.author.dataValues.following).toBe(false);
  });

  test("nonexistent article slug -> NotFoundError", async () => {
    Article.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await allComments({ params: { slug: "missing" } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // A top-level comment's replies are also decorated with follower info.
  test("replies are included and their authors decorated", async () => {
    const parentAuthor = makeFollowableUser({ id: 1, username: "jane" });
    const replyAuthor = makeFollowableUser({ id: 2, username: "bob" });
    const reply = makeCommentWithAuthor(replyAuthor);
    const comment = makeCommentWithAuthor(parentAuthor, { replies: [reply] });
    const article = makeInstance({}, { getComments: vi.fn().mockResolvedValue([comment]) });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await allComments({ loggedUser: undefined, params: { slug: "a-slug" } }, res, vi.fn());

    expect(article.getComments).toHaveBeenCalledWith(
      expect.objectContaining({ where: { parentId: null } }),
    );
    expect(res.json).toHaveBeenCalledWith({ comments: [comment] });
    expect(reply.author.dataValues.following).toBe(false);
  });
});

describe("createComment", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await createComment({ loggedUser: undefined, body: { comment: {} } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-040: an empty body is rejected.
  test("empty body -> FieldRequiredError, no comment created", async () => {
    const next = vi.fn();

    await createComment(
      { loggedUser: makeFollowableUser(), body: { comment: { body: "" } }, params: { slug: "a" } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(FieldRequiredError);
    expect(Comment.create).not.toHaveBeenCalled();
  });

  // AC-041: a valid body against a nonexistent article slug is rejected.
  test("nonexistent article slug -> NotFoundError", async () => {
    Article.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await createComment(
      { loggedUser: makeFollowableUser(), body: { comment: { body: "hi" } }, params: { slug: "missing" } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-043: the server only checks that `body` is truthy - a whitespace-only
  // body is accepted (the client is what blocks it, see AC-042).
  test("whitespace-only body -> accepted and created", async () => {
    Article.findOne.mockResolvedValue(makeInstance({ id: 5 }));
    Comment.create.mockResolvedValue(makeInstance({ id: 1, body: "   " }));
    const res = makeRes();

    await createComment(
      { loggedUser: makeFollowableUser(), body: { comment: { body: "   " } }, params: { slug: "a" } },
      res,
      vi.fn(),
    );

    expect(Comment.create).toHaveBeenCalledWith(expect.objectContaining({ body: "   " }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // A reply to a top-level comment is created with that comment's id as parentId.
  test("parentId of a top-level comment -> reply created with that parentId", async () => {
    Article.findOne.mockResolvedValue(makeInstance({ id: 5 }));
    Comment.findByPk.mockResolvedValue(makeInstance({ id: 3, parentId: null }));
    Comment.create.mockResolvedValue(makeInstance({ id: 4, body: "a reply" }));

    await createComment(
      {
        loggedUser: makeFollowableUser(),
        body: { comment: { body: "a reply", parentId: 3 } },
        params: { slug: "a" },
      },
      makeRes(),
      vi.fn(),
    );

    expect(Comment.create).toHaveBeenCalledWith(expect.objectContaining({ parentId: 3 }));
  });

  // Replying to a reply flattens to that reply's own root parent.
  test("parentId of a reply -> new comment attached to the root parent instead", async () => {
    Article.findOne.mockResolvedValue(makeInstance({ id: 5 }));
    Comment.findByPk.mockResolvedValue(makeInstance({ id: 4, parentId: 3 }));
    Comment.create.mockResolvedValue(makeInstance({ id: 6, body: "another reply" }));

    await createComment(
      {
        loggedUser: makeFollowableUser(),
        body: { comment: { body: "another reply", parentId: 4 } },
        params: { slug: "a" },
      },
      makeRes(),
      vi.fn(),
    );

    expect(Comment.create).toHaveBeenCalledWith(expect.objectContaining({ parentId: 3 }));
  });

  // A parentId that doesn't correspond to any comment is rejected.
  test("nonexistent parentId -> NotFoundError, no comment created", async () => {
    Article.findOne.mockResolvedValue(makeInstance({ id: 5 }));
    Comment.findByPk.mockResolvedValue(null);
    const next = vi.fn();

    await createComment(
      {
        loggedUser: makeFollowableUser(),
        body: { comment: { body: "a reply", parentId: 999 } },
        params: { slug: "a" },
      },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
    expect(Comment.create).not.toHaveBeenCalled();
  });

  // A top-level comment (no parentId) is unaffected by the reply logic.
  test("no parentId -> comment created with parentId null", async () => {
    Article.findOne.mockResolvedValue(makeInstance({ id: 5 }));
    Comment.create.mockResolvedValue(makeInstance({ id: 1, body: "top-level" }));

    await createComment(
      { loggedUser: makeFollowableUser(), body: { comment: { body: "top-level" } }, params: { slug: "a" } },
      makeRes(),
      vi.fn(),
    );

    expect(Comment.create).toHaveBeenCalledWith(expect.objectContaining({ parentId: null }));
    expect(Comment.findByPk).not.toHaveBeenCalled();
  });
});

describe("deleteComment", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await deleteComment({ loggedUser: undefined, params: {} }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-045: the comment's author can delete it.
  test("comment author deletes own comment", async () => {
    const author = makeFollowableUser({ id: 9 });
    const comment = makeInstance({ id: 1, userId: 9 }, { destroy: vi.fn().mockResolvedValue() });
    Comment.findByPk.mockResolvedValue(comment);
    const res = makeRes();

    await deleteComment({ loggedUser: author, params: { commentId: 1 } }, res, vi.fn());

    expect(comment.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: { body: ["Comment deleted successfully"] } });
  });

  // AC-046: a non-author cannot delete someone else's comment.
  test("non-author attempts delete -> ForbiddenError, comment not destroyed", async () => {
    const comment = makeInstance({ id: 1, userId: 9 }, { destroy: vi.fn().mockResolvedValue() });
    Comment.findByPk.mockResolvedValue(comment);
    const next = vi.fn();

    await deleteComment(
      { loggedUser: makeFollowableUser({ id: 2 }), params: { commentId: 1 } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
    expect(comment.destroy).not.toHaveBeenCalled();
  });
});
