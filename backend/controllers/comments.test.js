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

const {
  allComments,
  createComment,
  updateComment,
  deleteComment,
} = require("./comments");

function makeFollowableUser(overrides = {}) {
  return makeInstance(
    { id: 1, username: "jane", ...overrides },
    { hasFollower: vi.fn().mockResolvedValue(false), countFollowers: vi.fn().mockResolvedValue(0) },
  );
}

function makeCommentWithAuthor(author) {
  return makeInstance(
    { id: 1, body: "hi" },
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
});

describe("updateComment", () => {
  // AC-095
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await updateComment(
      { loggedUser: undefined, params: {}, body: { comment: {} } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("nonexistent comment -> NotFoundError", async () => {
    Comment.findByPk.mockResolvedValue(null);
    const next = vi.fn();

    await updateComment(
      {
        loggedUser: makeFollowableUser(),
        params: { commentId: 1 },
        body: { comment: { body: "edited" } },
      },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-093
  test("comment author edits own comment -> saved and returned", async () => {
    const author = makeFollowableUser({ id: 9 });
    const comment = makeInstance(
      { id: 1, userId: 9, body: "original" },
      { author, save: vi.fn().mockResolvedValue() },
    );
    Comment.findByPk.mockResolvedValue(comment);
    const res = makeRes();

    await updateComment(
      {
        loggedUser: author,
        params: { commentId: 1 },
        body: { comment: { body: "edited" } },
      },
      res,
      vi.fn(),
    );

    expect(comment.body).toBe("edited");
    expect(comment.save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ comment });
  });

  // AC-094
  test("non-author attempts edit -> ForbiddenError, not saved", async () => {
    const author = makeFollowableUser({ id: 9 });
    const comment = makeInstance(
      { id: 1, userId: 9, body: "original" },
      { author, save: vi.fn().mockResolvedValue() },
    );
    Comment.findByPk.mockResolvedValue(comment);
    const next = vi.fn();

    await updateComment(
      {
        loggedUser: makeFollowableUser({ id: 2 }),
        params: { commentId: 1 },
        body: { comment: { body: "edited" } },
      },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
    expect(comment.save).not.toHaveBeenCalled();
    expect(comment.body).toBe("original");
  });

  // AC-096
  test("empty body -> FieldRequiredError, not saved", async () => {
    const author = makeFollowableUser({ id: 9 });
    const comment = makeInstance(
      { id: 1, userId: 9, body: "original" },
      { author, save: vi.fn().mockResolvedValue() },
    );
    Comment.findByPk.mockResolvedValue(comment);
    const next = vi.fn();

    await updateComment(
      {
        loggedUser: author,
        params: { commentId: 1 },
        body: { comment: { body: "" } },
      },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(FieldRequiredError);
    expect(comment.save).not.toHaveBeenCalled();
    expect(comment.body).toBe("original");
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

// Threaded replies (REQ-064).
describe("threaded comment replies", () => {
  // AC-146: a reply attaches to its parent comment.
  test("createComment with a parentCommentId -> reply created with that parent", async () => {
    Article.findOne.mockResolvedValue(makeInstance({ id: 5 }));
    Comment.findByPk.mockResolvedValue(
      makeInstance({ id: 9, articleId: 5, body: "parent" }),
    );
    Comment.create.mockResolvedValue(makeInstance({ id: 10, body: "a reply" }));
    const res = makeRes();

    await createComment(
      {
        loggedUser: makeFollowableUser(),
        body: { comment: { body: "a reply", parentCommentId: 9 } },
        params: { slug: "a" },
      },
      res,
      vi.fn(),
    );

    expect(Comment.create).toHaveBeenCalledWith(
      expect.objectContaining({ body: "a reply", parentCommentId: 9 }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // AC-147: nesting is exactly one level — replying to a reply attaches
  // under the same top-level parent.
  test("replying to a reply -> attaches to the top-level parent instead", async () => {
    Article.findOne.mockResolvedValue(makeInstance({ id: 5 }));
    Comment.findByPk.mockResolvedValue(
      makeInstance({ id: 10, articleId: 5, parentCommentId: 9, body: "a reply" }),
    );
    Comment.create.mockResolvedValue(makeInstance({ id: 11, body: "nested reply" }));
    const res = makeRes();

    await createComment(
      {
        loggedUser: makeFollowableUser(),
        body: { comment: { body: "nested reply", parentCommentId: 10 } },
        params: { slug: "a" },
      },
      res,
      vi.fn(),
    );

    expect(Comment.create).toHaveBeenCalledWith(
      expect.objectContaining({ parentCommentId: 9 }),
    );
  });

  test("parentCommentId from another article -> NotFoundError, no reply created", async () => {
    Article.findOne.mockResolvedValue(makeInstance({ id: 5 }));
    Comment.findByPk.mockResolvedValue(
      makeInstance({ id: 9, articleId: 999, body: "other article" }),
    );
    const next = vi.fn();

    await createComment(
      {
        loggedUser: makeFollowableUser(),
        body: { comment: { body: "a reply", parentCommentId: 9 } },
        params: { slug: "a" },
      },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
    expect(Comment.create).not.toHaveBeenCalled();
  });

  test("nonexistent parentCommentId -> NotFoundError, no reply created", async () => {
    Article.findOne.mockResolvedValue(makeInstance({ id: 5 }));
    Comment.findByPk.mockResolvedValue(null);
    const next = vi.fn();

    await createComment(
      {
        loggedUser: makeFollowableUser(),
        body: { comment: { body: "a reply", parentCommentId: 77 } },
        params: { slug: "a" },
      },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
    expect(Comment.create).not.toHaveBeenCalled();
  });

  // AC-146: the listing returns top-level comments with their replies
  // nested under them.
  test("allComments -> replies nested under their parent", async () => {
    const author = makeFollowableUser();
    const bob = makeFollowableUser({ id: 2, username: "bob" });
    const parent = makeInstance(
      { id: 1, body: "parent" },
      { author, getAuthor: vi.fn().mockResolvedValue(author) },
    );
    const other = makeInstance(
      { id: 3, body: "other" },
      { author: bob, getAuthor: vi.fn().mockResolvedValue(bob) },
    );
    const reply = makeInstance(
      { id: 2, body: "reply", parentCommentId: 1 },
      { author: bob, getAuthor: vi.fn().mockResolvedValue(bob) },
    );

    const article = makeInstance(
      {},
      { getComments: vi.fn().mockResolvedValue([parent, reply, other]) },
    );
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await allComments({ loggedUser: undefined, params: { slug: "a-slug" } }, res, vi.fn());

    const { comments } = res.json.mock.calls[0][0];
    expect(comments.map((c) => c.dataValues.id)).toEqual([1, 3]);
    expect(comments[0].dataValues.replies).toEqual([reply]);
    expect(comments[1].dataValues.replies).toEqual([]);
  });

  // AC-149: without replies the listing is unchanged apart from each
  // comment carrying an empty replies list.
  test("allComments with no replies -> top-level comments each gain an empty replies list", async () => {
    const comment = makeCommentWithAuthor(makeFollowableUser());
    const article = makeInstance(
      {},
      { getComments: vi.fn().mockResolvedValue([comment]) },
    );
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await allComments({ loggedUser: undefined, params: { slug: "a-slug" } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ comments: [comment] });
    expect(comment.dataValues.replies).toEqual([]);
  });
});
