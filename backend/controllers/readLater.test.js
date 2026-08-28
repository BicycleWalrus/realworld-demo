const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn() };
mockRequire(require.resolve("../models"), { Article, Tag: {}, User: {} });

const { readLaterToggler, readLaterList } = require("./readLater");

function makeFollowableAuthor(overrides = {}) {
  return makeInstance(
    { id: 1, username: "author", ...overrides },
    { hasFollower: vi.fn().mockResolvedValue(false), countFollowers: vi.fn().mockResolvedValue(0) },
  );
}

function makeArticle({ author, hasUser = false, favoritesCount = 0, ...data }) {
  return makeInstance(
    { id: 1, slug: "a-slug", tagList: [], ...data },
    {
      author,
      getAuthor: vi.fn().mockResolvedValue(author),
      getTagList: vi.fn().mockResolvedValue([]),
      hasUser: vi.fn().mockResolvedValue(hasUser),
      countUsers: vi.fn().mockResolvedValue(favoritesCount),
    },
  );
}

function makeReaderUser(overrides = {}) {
  return makeInstance(
    { id: 2, username: "reader", ...overrides },
    {
      addReadLater: vi.fn().mockResolvedValue(),
      removeReadLater: vi.fn().mockResolvedValue(),
      hasReadLater: vi.fn().mockResolvedValue(false),
      getReadLater: vi.fn().mockResolvedValue([]),
      countReadLater: vi.fn().mockResolvedValue(0),
    },
  );
}

beforeEach(() => {
  Article.findOne.mockReset();
});

describe("readLaterToggler", () => {
  // AC-117: save/unsave requires authentication, mirroring REQ-025.
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await readLaterToggler({ loggedUser: undefined, params: {}, method: "POST" }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("nonexistent article slug -> NotFoundError", async () => {
    Article.findOne.mockResolvedValue(null);
    const loggedUser = makeReaderUser();
    const next = vi.fn();

    await readLaterToggler(
      { loggedUser, params: { slug: "missing" }, method: "POST" },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-117: saving an article the user hadn't saved yet.
  test("POST -> addReadLater called, response article has readLater true", async () => {
    const article = makeArticle({ author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    const loggedUser = makeReaderUser();
    loggedUser.hasReadLater.mockResolvedValue(true);
    const res = makeRes();

    await readLaterToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, res, vi.fn());

    expect(loggedUser.addReadLater).toHaveBeenCalledWith(article);
    expect(res.json).toHaveBeenCalledWith({ article });
    expect(article.dataValues.readLater).toBe(true);
  });

  // AC-117: unsaving a previously-saved article.
  test("DELETE -> removeReadLater called, response article has readLater false", async () => {
    const article = makeArticle({ author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    const loggedUser = makeReaderUser();
    loggedUser.hasReadLater.mockResolvedValue(false);
    const res = makeRes();

    await readLaterToggler({ loggedUser, params: { slug: "a-slug" }, method: "DELETE" }, res, vi.fn());

    expect(loggedUser.removeReadLater).toHaveBeenCalledWith(article);
    expect(article.dataValues.readLater).toBe(false);
  });

  // REQ-088/AC-119: saving/unsaving an article never touches Favorites -
  // the favorite count enrichment (hasUser/countUsers) is unaffected by a
  // read-later toggle.
  test("toggling read-later does not call Favorites accessors (addUser/removeUser)", async () => {
    const article = makeArticle({ author: makeFollowableAuthor(), favoritesCount: 4 });
    Article.findOne.mockResolvedValue(article);
    const loggedUser = makeReaderUser();
    const res = makeRes();

    await readLaterToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, res, vi.fn());

    expect(article.dataValues.favoritesCount).toBe(4);
    expect(article.addUser).toBeUndefined();
    expect(article.removeUser).toBeUndefined();
  });
});

describe("readLaterList", () => {
  // AC-118: viewing the list requires authentication.
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await readLaterList({ loggedUser: undefined, query: {} }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-118/AC-119: returns the requesting user's own saved articles
  // (derived from loggedUser - private) as { articles, articlesCount }.
  test("with loggedUser -> returns articles/articlesCount from getReadLater/countReadLater", async () => {
    const saved = makeArticle({ author: makeFollowableAuthor(), slug: "saved-1" });
    saved.ReadLater = { createdAt: new Date("2020-01-01") };
    const loggedUser = makeReaderUser();
    loggedUser.getReadLater.mockResolvedValue([saved]);
    loggedUser.countReadLater.mockResolvedValue(1);
    const res = makeRes();

    await readLaterList({ loggedUser, query: {} }, res, vi.fn());

    expect(loggedUser.getReadLater).toHaveBeenCalled();
    expect(loggedUser.countReadLater).toHaveBeenCalled();
    const { articles, articlesCount } = res.json.mock.calls[0][0];
    expect(articlesCount).toBe(1);
    expect(articles.map((a) => a.slug)).toEqual(["saved-1"]);
  });

  // AC-118: most-recently-added first, ordered by the ReadLater join
  // table's own createdAt (not the article's).
  test("orders saved articles most-recently-added first", async () => {
    const older = makeArticle({ author: makeFollowableAuthor(), slug: "older", id: 1 });
    older.ReadLater = { createdAt: new Date("2020-01-01") };
    const newer = makeArticle({ author: makeFollowableAuthor(), slug: "newer", id: 2 });
    newer.ReadLater = { createdAt: new Date("2020-01-05") };
    const loggedUser = makeReaderUser();
    loggedUser.getReadLater.mockResolvedValue([older, newer]);
    loggedUser.countReadLater.mockResolvedValue(2);
    const res = makeRes();

    await readLaterList({ loggedUser, query: {} }, res, vi.fn());

    const { articles } = res.json.mock.calls[0][0];
    expect(articles.map((a) => a.slug)).toEqual(["newer", "older"]);
  });

  // Pagination mirrors the rest of the API: bounded by limit/offset, true
  // total count reported regardless of page size.
  test("paginates via limit/offset while reporting the true total count", async () => {
    const seed = [1, 2, 3, 4].map((n) => {
      const a = makeArticle({ author: makeFollowableAuthor(), slug: `saved-${n}`, id: n });
      a.ReadLater = { createdAt: new Date(`2020-01-0${n}`) };
      return a;
    });
    const loggedUser = makeReaderUser();
    loggedUser.getReadLater.mockResolvedValue(seed);
    loggedUser.countReadLater.mockResolvedValue(4);
    const res = makeRes();

    await readLaterList({ loggedUser, query: { limit: 2, offset: 0 } }, res, vi.fn());

    const { articles, articlesCount } = res.json.mock.calls[0][0];
    expect(articlesCount).toBe(4);
    expect(articles.map((a) => a.slug)).toEqual(["saved-4", "saved-3"]);
  });
});
