const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn(), findAll: vi.fn() };
const ReadLater = { findAll: vi.fn() };
mockRequire(require.resolve("../models"), {
  Article,
  Tag: {},
  User: {},
  sequelize: { models: { ReadLater } },
});

const { readLaterToggler, readLaterList } = require("./readLater");

function makeArticle({ id = 1, slug = "a-slug", isSaved = false } = {}) {
  return makeInstance(
    { id, slug },
    {
      addSavedByUser: vi.fn().mockResolvedValue(),
      removeSavedByUser: vi.fn().mockResolvedValue(),
      hasSavedByUser: vi.fn().mockResolvedValue(isSaved),
    },
  );
}

// readLaterList runs each returned article through the same
// appendTagList/appendFollowers/appendFavorites post-processing every
// other listing endpoint does (so tags/favorited/following aren't
// missing on this page) - these mocks give a fetched article everything
// that post-processing calls.
function makeListedArticle({ id, slug }) {
  const author = makeInstance(
    { username: "author" },
    { hasFollower: vi.fn().mockResolvedValue(false), countFollowers: vi.fn().mockResolvedValue(0) },
  );
  return makeInstance(
    { id, slug, author },
    {
      getTagList: vi.fn().mockResolvedValue([]),
      getAuthor: vi.fn().mockResolvedValue(author),
      hasUser: vi.fn().mockResolvedValue(false),
      countUsers: vi.fn().mockResolvedValue(0),
    },
  );
}

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  Article.findOne.mockReset();
  Article.findAll.mockReset();
  ReadLater.findAll.mockReset();
});

describe("readLaterToggler", () => {
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

  test("POST on an unsaved article -> addSavedByUser called, isSaved true", async () => {
    const article = makeArticle({ isSaved: true });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await readLaterToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, res, vi.fn());

    expect(article.addSavedByUser).toHaveBeenCalledWith(loggedUser);
    expect(res.json).toHaveBeenCalledWith({ article: { slug: "a-slug", isSaved: true } });
  });

  test("DELETE on a saved article -> removeSavedByUser called, isSaved false", async () => {
    const article = makeArticle({ isSaved: false });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await readLaterToggler(
      { loggedUser, params: { slug: "a-slug" }, method: "DELETE" },
      res,
      vi.fn(),
    );

    expect(article.removeSavedByUser).toHaveBeenCalledWith(loggedUser);
    expect(res.json).toHaveBeenCalledWith({ article: { slug: "a-slug", isSaved: false } });
  });

  // This is a distinct concept from favoriting (REQ-025/REQ-026): no
  // Favorites-related method is ever called by this controller.
  test("never touches the Favorites association", async () => {
    const article = makeArticle();
    article.addUser = vi.fn();
    article.removeUser = vi.fn();
    Article.findOne.mockResolvedValue(article);

    await readLaterToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, makeRes(), vi.fn());

    expect(article.addUser).not.toHaveBeenCalled();
    expect(article.removeUser).not.toHaveBeenCalled();
  });
});

describe("readLaterList", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await readLaterList({ loggedUser: undefined }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("returns saved articles, most recently saved first", async () => {
    ReadLater.findAll.mockResolvedValue([{ articleId: 2 }, { articleId: 1 }]);
    const article1 = makeListedArticle({ id: 1, slug: "first-saved" });
    const article2 = makeListedArticle({ id: 2, slug: "second-saved" });
    // findAll doesn't guarantee row order for an IN-clause, so return them
    // out of order here to prove the controller re-sorts by save order.
    Article.findAll.mockResolvedValue([article1, article2]);
    const res = makeRes();

    await readLaterList({ loggedUser }, res, vi.fn());

    expect(ReadLater.findAll).toHaveBeenCalledWith({
      where: { userId: loggedUser.id },
      order: [["createdAt", "DESC"]],
    });
    expect(res.json).toHaveBeenCalledWith({
      articles: [article2, article1],
      articlesCount: 2,
    });
  });

  // Each returned article gets the same tagList/favorited/following
  // fields every other listing endpoint appends - a prior version of
  // this controller skipped this step, which crashed the read-later
  // page's rendering for any saved article with tags.
  test("appends tagList/favorited/following to each returned article", async () => {
    ReadLater.findAll.mockResolvedValue([{ articleId: 1 }]);
    const article = makeListedArticle({ id: 1, slug: "a-slug" });
    Article.findAll.mockResolvedValue([article]);
    const res = makeRes();

    await readLaterList({ loggedUser }, res, vi.fn());

    expect(article.getTagList).toHaveBeenCalled();
    expect(article.dataValues.tagList).toEqual([]);
    expect(article.dataValues.favorited).toBe(false);
    expect(article.dataValues.favoritesCount).toBe(0);
    expect(article.author.dataValues.following).toBe(false);
  });

  test("empty read-later list -> empty array, not an error", async () => {
    ReadLater.findAll.mockResolvedValue([]);
    Article.findAll.mockResolvedValue([]);
    const res = makeRes();

    await readLaterList({ loggedUser }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ articles: [], articlesCount: 0 });
  });
});
