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
    const article1 = makeInstance({ id: 1, slug: "first-saved" });
    const article2 = makeInstance({ id: 2, slug: "second-saved" });
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

  test("empty read-later list -> empty array, not an error", async () => {
    ReadLater.findAll.mockResolvedValue([]);
    Article.findAll.mockResolvedValue([]);
    const res = makeRes();

    await readLaterList({ loggedUser }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ articles: [], articlesCount: 0 });
  });
});
