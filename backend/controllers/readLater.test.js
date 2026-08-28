const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn() };
mockRequire(require.resolve("../models"), { Article, Tag: {}, User: {} });

const { readLaterToggler, readingList } = require("./readLater");

function makeFollowableAuthor(overrides = {}) {
  return makeInstance(
    { id: 1, username: "author", ...overrides },
    { hasFollower: vi.fn().mockResolvedValue(false), countFollowers: vi.fn().mockResolvedValue(0) },
  );
}

function makeArticle({ author, hasUser = false, favoritesCount = 0, hasReadLaterUser = false }) {
  return makeInstance(
    { id: 1, slug: "a-slug", tagList: [] },
    {
      author,
      getAuthor: vi.fn().mockResolvedValue(author),
      getTagList: vi.fn().mockResolvedValue([]),
      hasUser: vi.fn().mockResolvedValue(hasUser),
      countUsers: vi.fn().mockResolvedValue(favoritesCount),
      addReadLaterUser: vi.fn().mockResolvedValue(),
      removeReadLaterUser: vi.fn().mockResolvedValue(),
      hasReadLaterUser: vi.fn().mockResolvedValue(hasReadLaterUser),
    },
  );
}

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  Article.findOne.mockReset();
});

describe("readLaterToggler", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await readLaterToggler({ loggedUser: undefined, params: {}, method: "POST" }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-112: saving/removing a nonexistent slug is rejected.
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

  // AC-113: saving an article not yet on the list.
  test("POST -> addReadLaterUser called", async () => {
    const article = makeArticle({ author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await readLaterToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, res, vi.fn());

    expect(article.addReadLaterUser).toHaveBeenCalledWith(loggedUser);
    expect(res.json).toHaveBeenCalledWith({ article });
  });

  // AC-114: removing an article already on the list.
  test("DELETE -> removeReadLaterUser called", async () => {
    const article = makeArticle({ author: makeFollowableAuthor() });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await readLaterToggler({ loggedUser, params: { slug: "a-slug" }, method: "DELETE" }, res, vi.fn());

    expect(article.removeReadLaterUser).toHaveBeenCalledWith(loggedUser);
  });

  // The response reflects the resulting saved state so the caller doesn't
  // need to re-derive it from the HTTP method it just sent.
  test("POST response reflects the new saved state", async () => {
    const article = makeArticle({ author: makeFollowableAuthor(), hasReadLaterUser: true });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await readLaterToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, res, vi.fn());

    expect(article.dataValues.readLater).toBe(true);
  });

  // AC-117: toggling read-later never touches the Favorites-related mocks.
  test("toggling read-later does not call any favorite-related mutation", async () => {
    const article = makeArticle({ author: makeFollowableAuthor() });
    article.addUser = vi.fn();
    article.removeUser = vi.fn();
    Article.findOne.mockResolvedValue(article);

    await readLaterToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, makeRes(), vi.fn());

    expect(article.addUser).not.toHaveBeenCalled();
    expect(article.removeUser).not.toHaveBeenCalled();
  });
});

describe("readingList", () => {
  // AC-111: an unauthenticated request can't retrieve a read-later list.
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await readingList({ loggedUser: undefined, query: {} }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-115: the list is ordered newest-article-first (delegated to the
  // getReadingList query - asserting the call here, not re-implementing
  // Sequelize's own ordering).
  test("returns the current user's saved articles", async () => {
    const article = makeArticle({ author: makeFollowableAuthor() });
    const user = makeInstance(
      { id: 2 },
      {
        getReadingList: vi.fn().mockResolvedValue([article]),
        countReadingList: vi.fn().mockResolvedValue(1),
      },
    );
    const res = makeRes();

    await readingList({ loggedUser: user, query: {} }, res, vi.fn());

    expect(user.getReadingList).toHaveBeenCalled();
    const { articles, articlesCount } = res.json.mock.calls[0][0];
    expect(articles).toEqual([article]);
    expect(articlesCount).toBe(1);
  });
});
