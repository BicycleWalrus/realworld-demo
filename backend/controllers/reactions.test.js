const {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn() };
const Reaction = { findOrCreate: vi.fn(), destroy: vi.fn() };
mockRequire(require.resolve("../models"), { Article, Reaction, Tag: {}, User: {} });

const { setReaction, removeReaction } = require("./reactions");

function makeFollowableAuthor(overrides = {}) {
  return makeInstance(
    { id: 1, username: "author", ...overrides },
    { hasFollower: vi.fn().mockResolvedValue(false), countFollowers: vi.fn().mockResolvedValue(0) },
  );
}

function makeArticle({ id = 1, author, reactions = [] }) {
  return makeInstance(
    { id, slug: "a-slug", tagList: [] },
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
  Reaction.findOrCreate.mockReset();
  Reaction.destroy.mockReset();
});

describe("setReaction", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await setReaction({ loggedUser: undefined, params: {}, body: {} }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-084: only a documented reaction type is accepted.
  test("invalid reaction type -> ValidationError, no article lookup", async () => {
    const next = vi.fn();

    await setReaction(
      { loggedUser, params: { slug: "a-slug" }, body: { type: "not-a-real-type" } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
    expect(Article.findOne).not.toHaveBeenCalled();
  });

  test("nonexistent article slug -> NotFoundError", async () => {
    Article.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await setReaction(
      { loggedUser, params: { slug: "missing" }, body: { type: "like" } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-080: setting a reaction for the first time creates it.
  test("first reaction -> findOrCreate with the given type, myReaction set", async () => {
    const article = makeArticle({ author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    Reaction.findOrCreate.mockResolvedValue([
      makeInstance({ type: "like", userId: loggedUser.id }, { save: vi.fn() }),
      true,
    ]);
    const res = makeRes();

    await setReaction(
      { loggedUser, params: { slug: "a-slug" }, body: { type: "like" } },
      res,
      vi.fn(),
    );

    expect(Reaction.findOrCreate).toHaveBeenCalledWith({
      where: { userId: loggedUser.id, articleId: 1 },
      defaults: { type: "like" },
    });
    expect(res.json).toHaveBeenCalledWith({ article });
  });

  // AC-080: changing an existing reaction updates its type in place -
  // still exactly one reaction row for this user+article.
  test("changing an existing reaction -> type updated and saved, not duplicated", async () => {
    const article = makeArticle({ author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    const existing = makeInstance({ type: "like", userId: loggedUser.id }, { save: vi.fn().mockResolvedValue() });
    Reaction.findOrCreate.mockResolvedValue([existing, false]);
    const res = makeRes();

    await setReaction(
      { loggedUser, params: { slug: "a-slug" }, body: { type: "celebrate" } },
      res,
      vi.fn(),
    );

    expect(existing.type).toBe("celebrate");
    expect(existing.save).toHaveBeenCalled();
  });

  // AC-085: setting a reaction reads (but never writes) Favorites state -
  // the response still reports it for a consistent article shape, but no
  // Favorites row is created as a side effect (the fake has no addUser/
  // removeUser method at all; calling either would throw here).
  test("setting a reaction does not favorite the article", async () => {
    const article = makeArticle({ author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    Reaction.findOrCreate.mockResolvedValue([
      makeInstance({ type: "like", userId: loggedUser.id }, {}),
      true,
    ]);
    const res = makeRes();

    await setReaction(
      { loggedUser, params: { slug: "a-slug" }, body: { type: "like" } },
      res,
      vi.fn(),
    );

    expect(article.dataValues.favorited).toBe(false);
  });
});

describe("removeReaction", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await removeReaction({ loggedUser: undefined, params: {} }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("nonexistent article slug -> NotFoundError", async () => {
    Article.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await removeReaction({ loggedUser, params: { slug: "missing" } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-081: removing a reaction destroys this user's row for this article.
  test("destroys this user's reaction row for the article", async () => {
    const article = makeArticle({ id: 7, author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await removeReaction({ loggedUser, params: { slug: "a-slug" } }, res, vi.fn());

    expect(Reaction.destroy).toHaveBeenCalledWith({
      where: { userId: loggedUser.id, articleId: 7 },
    });
    expect(res.json).toHaveBeenCalledWith({ article });
  });
});
