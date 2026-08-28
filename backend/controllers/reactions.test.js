const { FieldRequiredError, NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn() };
const Reaction = { findOne: vi.fn(), findAll: vi.fn(), create: vi.fn(), destroy: vi.fn() };
mockRequire(require.resolve("../models"), { Article, Reaction, Tag: {}, User: {} });

const { reactionToggler } = require("./reactions");

const loggedUser = makeInstance({ id: 2, username: "reader" });

function makeArticle(overrides = {}) {
  return makeInstance({ id: 1, slug: "a-slug", ...overrides });
}

beforeEach(() => {
  Article.findOne.mockReset();
  Reaction.findOne.mockReset();
  Reaction.findAll.mockReset();
  Reaction.create.mockReset();
  Reaction.destroy.mockReset();
  Reaction.findAll.mockResolvedValue([]);
});

describe("reactionToggler", () => {
  // AC-125: reacting requires authentication, mirroring REQ-025.
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await reactionToggler(
      { loggedUser: undefined, params: {}, method: "POST", body: {} },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-125: reacting to a nonexistent article is rejected.
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

  // AC-125: only the fixed reaction set is accepted; an unknown type is
  // rejected and no reaction is created.
  test("invalid reaction type -> FieldRequiredError, no create", async () => {
    Article.findOne.mockResolvedValue(makeArticle());
    const next = vi.fn();

    await reactionToggler(
      { loggedUser, params: { slug: "a-slug" }, method: "POST", body: { reaction: { type: "dislike" } } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(FieldRequiredError);
    expect(Reaction.create).not.toHaveBeenCalled();
  });

  // AC-125/AC-126: a first-time reaction is created, and the response
  // reflects the new counts and the viewer's own reaction.
  test("POST valid type, no existing reaction -> Reaction.create called, counts/reaction reflected", async () => {
    const article = makeArticle();
    Article.findOne.mockResolvedValue(article);
    Reaction.findOne.mockResolvedValue(null);
    Reaction.findAll.mockResolvedValue([{ type: "like", userId: 2 }]);
    const res = makeRes();

    await reactionToggler(
      { loggedUser, params: { slug: "a-slug" }, method: "POST", body: { reaction: { type: "like" } } },
      res,
      vi.fn(),
    );

    expect(Reaction.create).toHaveBeenCalledWith({ articleId: 1, userId: 2, type: "like" });
    expect(res.json).toHaveBeenCalledWith({ article });
    expect(article.dataValues.reactionCounts).toEqual({ like: 1, insightful: 0, celebrate: 0 });
    expect(article.dataValues.reaction).toBe("like");
  });

  // AC-125: reacting again with a different type changes the existing
  // reaction rather than creating a second one - at most one per user.
  test("POST valid type, existing reaction -> existing.save called with new type, no create", async () => {
    const article = makeArticle();
    Article.findOne.mockResolvedValue(article);
    const existing = makeInstance({ id: 5, type: "like" }, { save: vi.fn().mockResolvedValue() });
    Reaction.findOne.mockResolvedValue(existing);
    Reaction.findAll.mockResolvedValue([{ type: "celebrate", userId: 2 }]);
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

  // AC-125: an explicit remove deletes the user's reaction on the article.
  test("DELETE -> Reaction.destroy called with articleId/userId", async () => {
    const article = makeArticle();
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await reactionToggler(
      { loggedUser, params: { slug: "a-slug" }, method: "DELETE", body: {} },
      res,
      vi.fn(),
    );

    expect(Reaction.destroy).toHaveBeenCalledWith({ where: { articleId: 1, userId: 2 } });
  });

  // AC-126: counts tally per type across all users; the viewer's own
  // reaction is picked out of the full set by userId.
  test("counts tally across multiple users' reactions; reaction is the loggedUser's own", async () => {
    const article = makeArticle();
    Article.findOne.mockResolvedValue(article);
    Reaction.findAll.mockResolvedValue([
      { type: "like", userId: 2 },
      { type: "like", userId: 3 },
      { type: "celebrate", userId: 4 },
    ]);
    const res = makeRes();

    await reactionToggler(
      { loggedUser, params: { slug: "a-slug" }, method: "DELETE", body: {} },
      res,
      vi.fn(),
    );

    expect(article.dataValues.reactionCounts).toEqual({ like: 2, insightful: 0, celebrate: 1 });
    expect(article.dataValues.reaction).toBe("like");
  });
});
