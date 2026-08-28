const {
  FieldRequiredError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn() };
const Comment = { create: vi.fn(), findByPk: vi.fn() };
const User = { findAll: vi.fn() };
mockRequire(require.resolve("../models"), { Article, Comment, User });

const { allComments, createComment, deleteComment, updateComment } = require("./comments");

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
  User.findAll.mockReset();
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

  // AC-111/AC-112: only usernames that correspond to an existing user are
  // attached as `mentions` - "@jane" resolves (a real user), "@ghost" does
  // not, and is therefore left out.
  test("mentions -> only valid usernames from the body are attached", async () => {
    const author = makeFollowableUser();
    const comment = makeCommentWithAuthor(author);
    comment.dataValues.body = "hi @jane and @ghost";
    const article = makeInstance({}, { getComments: vi.fn().mockResolvedValue([comment]) });
    Article.findOne.mockResolvedValue(article);
    User.findAll.mockResolvedValue([makeInstance({ username: "jane" })]);
    const res = makeRes();

    await allComments({ loggedUser: undefined, params: { slug: "a-slug" } }, res, vi.fn());

    expect(User.findAll).toHaveBeenCalledWith({
      where: { username: ["jane", "ghost"] },
      attributes: ["username"],
    });
    expect(comment.dataValues.mentions).toEqual(["jane"]);
  });

  // AC-111/AC-112: a body with no "@word" tokens attaches an empty
  // `mentions` list without querying for users.
  test("no @mention tokens -> mentions is empty and User.findAll is not called", async () => {
    const author = makeFollowableUser();
    const comment = makeCommentWithAuthor(author);
    const article = makeInstance({}, { getComments: vi.fn().mockResolvedValue([comment]) });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await allComments({ loggedUser: undefined, params: { slug: "a-slug" } }, res, vi.fn());

    expect(User.findAll).not.toHaveBeenCalled();
    expect(comment.dataValues.mentions).toEqual([]);
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

describe("updateComment", () => {
  // AC-096: an unauthenticated request is rejected.
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await updateComment(
      { loggedUser: undefined, params: {}, body: { comment: {} } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("comment not found -> NotFoundError", async () => {
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

  // AC-096: a non-author cannot edit someone else's comment.
  test("non-author attempts edit -> ForbiddenError, comment not saved", async () => {
    const comment = makeInstance(
      { id: 1, userId: 9, body: "original" },
      { save: vi.fn().mockResolvedValue() },
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

  // AC-097: an empty body is rejected and the comment is left unsaved.
  test("empty body -> FieldRequiredError, comment not saved", async () => {
    const comment = makeInstance(
      { id: 1, userId: 9, body: "original" },
      { save: vi.fn().mockResolvedValue() },
    );
    Comment.findByPk.mockResolvedValue(comment);
    const next = vi.fn();

    await updateComment(
      {
        loggedUser: makeFollowableUser({ id: 9 }),
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

  // AC-098: the comment's author can edit its body, and the persisted
  // comment reflects the new value.
  test("comment author edits own comment -> body updated and saved", async () => {
    const author = makeFollowableUser({ id: 9 });
    const comment = makeInstance(
      { id: 1, userId: 9, body: "original" },
      { save: vi.fn().mockResolvedValue() },
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
});
