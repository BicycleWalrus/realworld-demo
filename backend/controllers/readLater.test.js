const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn() };
const ReadLater = { findOrCreate: vi.fn(), destroy: vi.fn(), findAndCountAll: vi.fn() };
mockRequire(require.resolve("../models"), { Article, ReadLater, Tag: {}, User: {} });

const { readLaterToggler, readLaterList } = require("./readLater");

function makeFollowableAuthor(overrides = {}) {
  return makeInstance(
    { id: 1, username: "author", ...overrides },
    { hasFollower: vi.fn().mockResolvedValue(false), countFollowers: vi.fn().mockResolvedValue(0) },
  );
}

function makeArticle({ id = 1, author, hasUser = false, favoritesCount = 0, ...data }) {
  return makeInstance(
    { id, slug: "a-slug", tagList: [], ...data },
    {
      author,
      getAuthor: vi.fn().mockResolvedValue(author),
      getTagList: vi.fn().mockResolvedValue([]),
      hasUser: vi.fn().mockResolvedValue(hasUser),
      countUsers: vi.fn().mockResolvedValue(favoritesCount),
    },
  );
}

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  Article.findOne.mockReset();
  ReadLater.findOrCreate.mockReset();
  ReadLater.destroy.mockReset();
  ReadLater.findAndCountAll.mockReset();
});

describe("readLaterToggler", () => {
  // AC-082: saving/unsaving requires an authenticated session.
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await readLaterToggler({ loggedUser: undefined, params: {}, method: "POST" }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("nonexistent article slug -> NotFoundError", async () => {
    Article.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await readLaterToggler(
      { loggedUser, params: { slug: "missing" }, method: "POST" },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-080: saving an article adds it to the user's read-later list,
  // via ReadLater directly - not Favorites.
  test("POST -> findOrCreate called for this user+article, readLater true", async () => {
    const article = makeArticle({ id: 5, author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await readLaterToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, res, vi.fn());

    expect(ReadLater.findOrCreate).toHaveBeenCalledWith({
      where: { userId: loggedUser.id, articleId: 5 },
    });
    expect(res.json).toHaveBeenCalledWith({ article });
    expect(article.dataValues.readLater).toBe(true);
  });

  // AC-080: removing an article takes it back out of the list.
  test("DELETE -> destroy called for this user+article, readLater false", async () => {
    const article = makeArticle({ id: 5, author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await readLaterToggler({ loggedUser, params: { slug: "a-slug" }, method: "DELETE" }, res, vi.fn());

    expect(ReadLater.destroy).toHaveBeenCalledWith({
      where: { userId: loggedUser.id, articleId: 5 },
    });
    expect(article.dataValues.readLater).toBe(false);
  });
});

describe("readLaterList", () => {
  // AC-082: the list is private to the requesting user's own session.
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await readLaterList({ loggedUser: undefined, query: {} }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-081: most recently added first - mirrors the order the fake
  // findAndCountAll mock is seeded with, since actual DB ordering is
  // exercised via the real order: [["createdAt", "DESC"]] clause,
  // verified manually.
  test("returns the current user's saved articles with readLater/favorited appended", async () => {
    const newer = makeArticle({ id: 2, slug: "newer", author: makeFollowableAuthor() });
    const older = makeArticle({ id: 1, slug: "older", author: makeFollowableAuthor() });
    ReadLater.findAndCountAll.mockResolvedValue({
      rows: [{ Article: newer }, { Article: older }],
      count: 2,
    });
    const res = makeRes();

    await readLaterList({ loggedUser, query: {} }, res, vi.fn());

    const { articles, articlesCount } = res.json.mock.calls[0][0];
    expect(articles.map((a) => a.slug)).toEqual(["newer", "older"]);
    expect(articlesCount).toBe(2);
    expect(articles.every((a) => a.dataValues.readLater)).toBe(true);
  });

  test("empty list -> empty articles, zero count", async () => {
    ReadLater.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = makeRes();

    await readLaterList({ loggedUser, query: {} }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ articles: [], articlesCount: 0 });
  });
});
