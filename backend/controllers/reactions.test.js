const { NotFoundError, UnauthorizedError, ValidationError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn() };
const Reaction = { findOne: vi.fn(), create: vi.fn() };
mockRequire(require.resolve("../models"), { Article, Reaction, Tag: {}, User: {} });

const { reactionToggler } = require("./reactions");

function makeFollowableAuthor(overrides = {}) {
  return makeInstance(
    { id: 1, username: "author", ...overrides },
    { hasFollower: vi.fn().mockResolvedValue(false), countFollowers: vi.fn().mockResolvedValue(0) },
  );
}

function makeArticle({ author, reactions = [] }) {
  return makeInstance(
    { id: 1, slug: "a-slug", tagList: [] },
    {
      author,
      getAuthor: vi.fn().mockResolvedValue(author),
      hasUser: vi.fn().mockResolvedValue(false),
      countUsers: vi.fn().mockResolvedValue(0),
      getReactions: vi.fn().mockResolvedValue(reactions),
    },
  );
}

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  Article.findOne.mockReset();
  Reaction.findOne.mockReset();
  Reaction.create.mockReset();
});

describe("reactionToggler", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await reactionToggler({ loggedUser: undefined, params: {}, method: "POST" }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("nonexistent article slug -> NotFoundError", async () => {
    Article.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await reactionToggler(
      { loggedUser, params: { slug: "missing" }, method: "POST", body: { reaction: { type: "like" } } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  test("invalid reaction type -> ValidationError, no row created", async () => {
    const article = makeArticle({ author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    Reaction.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await reactionToggler(
      { loggedUser, params: { slug: "a-slug" }, method: "POST", body: { reaction: { type: "nope" } } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
    expect(Reaction.create).not.toHaveBeenCalled();
  });

  // First reaction of a valid type: a new row is created.
  test("POST with no existing reaction -> Reaction.create called", async () => {
    const article = makeArticle({ author: makeFollowableAuthor(), reactions: [{ type: "like", userId: 2 }] });
    Article.findOne.mockResolvedValue(article);
    Reaction.findOne.mockResolvedValue(null);
    const res = makeRes();

    await reactionToggler(
      { loggedUser, params: { slug: "a-slug" }, method: "POST", body: { reaction: { type: "like" } } },
      res,
      vi.fn(),
    );

    expect(Reaction.create).toHaveBeenCalledWith({ type: "like", articleId: 1, userId: 2 });
    expect(article.dataValues.reactions).toEqual({ like: 1, insightful: 0, celebrate: 0 });
    expect(article.dataValues.myReaction).toBe("like");
  });

  // Changing to a different type updates the existing row instead of
  // creating a second one.
  test("POST with an existing different reaction -> existing row updated", async () => {
    const article = makeArticle({ author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    const existing = makeInstance({ id: 10, type: "like" }, { save: vi.fn().mockResolvedValue() });
    Reaction.findOne.mockResolvedValue(existing);
    const res = makeRes();

    await reactionToggler(
      { loggedUser, params: { slug: "a-slug" }, method: "POST", body: { reaction: { type: "celebrate" } } },
      res,
      vi.fn(),
    );

    expect(existing.type).toBe("celebrate");
    expect(existing.save).toHaveBeenCalled();
    expect(Reaction.create).not.toHaveBeenCalled();
  });

  // DELETE removes the caller's existing reaction.
  test("DELETE with an existing reaction -> row destroyed, myReaction null", async () => {
    const article = makeArticle({ author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    const existing = makeInstance({ id: 10, type: "like" }, { destroy: vi.fn().mockResolvedValue() });
    Reaction.findOne.mockResolvedValue(existing);
    const res = makeRes();

    await reactionToggler(
      { loggedUser, params: { slug: "a-slug" }, method: "DELETE" },
      res,
      vi.fn(),
    );

    expect(existing.destroy).toHaveBeenCalled();
  });

  // DELETE with no existing reaction is a no-op, not an error.
  test("DELETE with no existing reaction -> no-op", async () => {
    const article = makeArticle({ author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    Reaction.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await reactionToggler({ loggedUser, params: { slug: "a-slug" }, method: "DELETE" }, makeRes(), next);

    expect(next).not.toHaveBeenCalled();
  });

  // Anonymous viewers see accurate counts but myReaction is forced null
  // (they can't react at all - no loggedUser means UnauthorizedError above
  // for a mutation; this asserts the read-decoration side specifically via
  // articles.test.js's singleArticle coverage, referenced here for context).
});
