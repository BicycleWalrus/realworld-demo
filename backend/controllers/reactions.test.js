const {
  FieldRequiredError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn() };
const Reactions = { findAll: vi.fn(), findOne: vi.fn(), create: vi.fn() };
mockRequire(require.resolve("../models"), {
  Article,
  Tag: {},
  User: {},
  sequelize: { models: { Reactions } },
});

const { removeReaction, setReaction } = require("./reactions");

function makeFollowableAuthor() {
  return makeInstance(
    { id: 1, username: "author" },
    { hasFollower: vi.fn().mockResolvedValue(false), countFollowers: vi.fn().mockResolvedValue(0) },
  );
}

function makeArticle({ author = makeFollowableAuthor(), favoritesCount = 0 } = {}) {
  return makeInstance(
    { id: 5, slug: "a-slug", tagList: [] },
    {
      author,
      getAuthor: vi.fn().mockResolvedValue(author),
      hasUser: vi.fn().mockResolvedValue(false),
      countUsers: vi.fn().mockResolvedValue(favoritesCount),
    },
  );
}

beforeEach(() => {
  Article.findOne.mockReset();
  Reactions.findAll.mockReset().mockResolvedValue([]);
  Reactions.findOne.mockReset();
  Reactions.create.mockReset();
});

describe("setReaction", () => {
  // AC-155/AC-157: reacting requires authentication, like favoriting
  // (REQ-025).
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await setReaction(
      { loggedUser: undefined, body: { reaction: { type: "like" } }, params: { slug: "a" } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("nonexistent article slug -> NotFoundError", async () => {
    Article.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await setReaction(
      {
        loggedUser: makeInstance({ id: 2 }),
        body: { reaction: { type: "like" } },
        params: { slug: "missing" },
      },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  test("missing reaction type -> FieldRequiredError", async () => {
    Article.findOne.mockResolvedValue(makeArticle());
    const next = vi.fn();

    await setReaction(
      { loggedUser: makeInstance({ id: 2 }), body: { reaction: {} }, params: { slug: "a-slug" } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(FieldRequiredError);
    expect(Reactions.create).not.toHaveBeenCalled();
  });

  // AC-155: the reaction must come from the fixed, documented set.
  test("reaction type outside the fixed set -> ValidationError", async () => {
    Article.findOne.mockResolvedValue(makeArticle());
    const next = vi.fn();

    await setReaction(
      {
        loggedUser: makeInstance({ id: 2 }),
        body: { reaction: { type: "hype" } },
        params: { slug: "a-slug" },
      },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(ValidationError);
    expect(Reactions.create).not.toHaveBeenCalled();
  });

  // AC-155: setting a reaction creates it; changing creates exactly one
  // row per user per article by updating in place.
  test("new reaction -> created and returned with counts", async () => {
    const article = makeArticle();
    Article.findOne.mockResolvedValue(article);
    Reactions.findOne.mockResolvedValue(null);
    // What the DB would return after the insert: the viewer's new row.
    Reactions.findAll.mockResolvedValue([{ type: "like", userId: 2 }]);
    const res = makeRes();

    await setReaction(
      {
        loggedUser: makeInstance({ id: 2 }),
        body: { reaction: { type: "like" } },
        params: { slug: "a-slug" },
      },
      res,
      vi.fn(),
    );

    expect(Reactions.create).toHaveBeenCalledWith({ articleId: 5, userId: 2, type: "like" });
    const { article: returned } = res.json.mock.calls[0][0];
    expect(returned.dataValues.reactions).toEqual({ like: 1, insightful: 0, celebrate: 0 });
    expect(returned.dataValues.viewerReaction).toBe("like");
  });

  test("changing an existing reaction -> updated in place, not duplicated", async () => {
    Article.findOne.mockResolvedValue(makeArticle());
    const existing = makeInstance(
      { articleId: 5, userId: 2, type: "like" },
      { update: vi.fn().mockResolvedValue() },
    );
    Reactions.findOne.mockResolvedValue(existing);
    const res = makeRes();

    await setReaction(
      {
        loggedUser: makeInstance({ id: 2 }),
        body: { reaction: { type: "celebrate" } },
        params: { slug: "a-slug" },
      },
      res,
      vi.fn(),
    );

    expect(existing.update).toHaveBeenCalledWith({ type: "celebrate" });
    expect(Reactions.create).not.toHaveBeenCalled();
  });

  // AC-156: the article representation carries per-type counts and the
  // viewer's own reaction, computed from the stored rows.
  test("counts and viewer reaction come from stored rows", async () => {
    const article = makeArticle();
    Article.findOne.mockResolvedValue(article);
    Reactions.findOne.mockResolvedValue(null);
    Reactions.findAll.mockResolvedValue([
      { type: "like", userId: 7 },
      { type: "like", userId: 8 },
      { type: "insightful", userId: 9 },
    ]);
    const res = makeRes();

    await setReaction(
      {
        loggedUser: makeInstance({ id: 9 }),
        body: { reaction: { type: "like" } },
        params: { slug: "a-slug" },
      },
      res,
      vi.fn(),
    );

    const { article: returned } = res.json.mock.calls[0][0];
    expect(returned.dataValues.reactions).toEqual({ like: 2, insightful: 1, celebrate: 0 });
    expect(returned.dataValues.viewerReaction).toBe("insightful");
  });
});

describe("removeReaction", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await removeReaction({ loggedUser: undefined, params: { slug: "a" } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("existing reaction -> destroyed and article returned without one", async () => {
    const article = makeArticle();
    Article.findOne.mockResolvedValue(article);
    const existing = makeInstance(
      { articleId: 5, userId: 2, type: "like" },
      { destroy: vi.fn().mockResolvedValue() },
    );
    Reactions.findOne.mockResolvedValue(existing);
    const res = makeRes();

    await removeReaction(
      { loggedUser: makeInstance({ id: 2 }), params: { slug: "a-slug" } },
      res,
      vi.fn(),
    );

    expect(existing.destroy).toHaveBeenCalled();
    const { article: returned } = res.json.mock.calls[0][0];
    expect(returned.dataValues.viewerReaction).toBe(null);
  });

  test("no existing reaction -> no error, nothing destroyed", async () => {
    Article.findOne.mockResolvedValue(makeArticle());
    Reactions.findOne.mockResolvedValue(null);
    const res = makeRes();
    const next = vi.fn();

    await removeReaction(
      { loggedUser: makeInstance({ id: 2 }), params: { slug: "a-slug" } },
      res,
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });
});
