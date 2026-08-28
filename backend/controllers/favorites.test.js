const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn() };
const Notification = { create: vi.fn() };
mockRequire(require.resolve("../models"), { Article, Tag: {}, User: {}, Notification });

const { favoriteToggler } = require("./favorites");

function makeFollowableAuthor(overrides = {}) {
  return makeInstance(
    { id: 1, username: "author", ...overrides },
    { hasFollower: vi.fn().mockResolvedValue(false), countFollowers: vi.fn().mockResolvedValue(0) },
  );
}

function makeArticle({ author, hasUser = false, favoritesCount = 0 }) {
  return makeInstance(
    { id: 1, slug: "a-slug", tagList: [] },
    {
      author,
      getAuthor: vi.fn().mockResolvedValue(author),
      hasUser: vi.fn().mockResolvedValue(hasUser),
      countUsers: vi.fn().mockResolvedValue(favoritesCount),
      addUser: vi.fn().mockResolvedValue(),
      removeUser: vi.fn().mockResolvedValue(),
    },
  );
}

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  Article.findOne.mockReset();
  Notification.create.mockReset();
});

describe("favoriteToggler", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await favoriteToggler({ loggedUser: undefined, params: {}, method: "POST" }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-049: favoriting/unfavoriting a nonexistent slug is rejected.
  test("nonexistent article slug -> NotFoundError", async () => {
    Article.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await favoriteToggler(
      { loggedUser, params: { slug: "missing" }, method: "POST" },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-047: favoriting an article the user hadn't favorited yet.
  test("POST on an unfavorited article -> addUser called, favorited true", async () => {
    const article = makeArticle({ author: makeFollowableAuthor(), hasUser: true, favoritesCount: 4 });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await favoriteToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, res, vi.fn());

    expect(article.addUser).toHaveBeenCalledWith(loggedUser);
    expect(res.json).toHaveBeenCalledWith({ article });
    expect(article.dataValues.favorited).toBe(true);
    expect(article.dataValues.favoritesCount).toBe(4);
  });

  // AC-128/REQ-097: favoriting someone else's article creates a "favorite"
  // notification for the article's author, naming the favoriter as actor.
  test("POST on another user's article -> Notification.create called with type favorite", async () => {
    const author = makeFollowableAuthor({ id: 1 });
    const article = makeArticle({ author, hasUser: true, favoritesCount: 4 });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await favoriteToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, res, vi.fn());

    expect(Notification.create).toHaveBeenCalledWith({
      recipientId: author.id,
      actorId: loggedUser.id,
      type: "favorite",
      articleId: article.id,
      commentId: null,
    });
  });

  // AC-128/REQ-097: favoriting your own article never notifies yourself
  // (self-suppression) - the article's author has the same id as the
  // acting user.
  test("POST on your own article -> Notification.create is not called", async () => {
    const selfAsAuthor = makeFollowableAuthor({ id: loggedUser.id });
    const ownArticle = makeArticle({ author: selfAsAuthor, hasUser: true, favoritesCount: 1 });
    Article.findOne.mockResolvedValue(ownArticle);
    const res = makeRes();

    await favoriteToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, res, vi.fn());

    expect(Notification.create).not.toHaveBeenCalled();
  });

  // AC-128/REQ-097: the favorite action itself must never fail because
  // notification creation failed - notifications are a side effect only.
  test("Notification.create rejecting does not break the favorite action", async () => {
    const article = makeArticle({ author: makeFollowableAuthor(), hasUser: true, favoritesCount: 4 });
    Article.findOne.mockResolvedValue(article);
    Notification.create.mockRejectedValue(new Error("db down"));
    const res = makeRes();
    const next = vi.fn();

    await favoriteToggler({ loggedUser, params: { slug: "a-slug" }, method: "POST" }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(article.addUser).toHaveBeenCalledWith(loggedUser);
    expect(res.json).toHaveBeenCalledWith({ article });
  });

  // AC-048: unfavoriting a previously-favorited article.
  test("DELETE on a favorited article -> removeUser called, favorited false", async () => {
    const article = makeArticle({ author: makeFollowableAuthor(), hasUser: false, favoritesCount: 3 });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await favoriteToggler({ loggedUser, params: { slug: "a-slug" }, method: "DELETE" }, res, vi.fn());

    expect(article.removeUser).toHaveBeenCalledWith(loggedUser);
    expect(article.dataValues.favorited).toBe(false);
    expect(article.dataValues.favoritesCount).toBe(3);
  });

  // AC-128/REQ-097: unfavoriting does not retract or create any notification.
  test("DELETE (unfavorite) -> Notification.create is not called", async () => {
    const article = makeArticle({ author: makeFollowableAuthor(), hasUser: false, favoritesCount: 3 });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await favoriteToggler({ loggedUser, params: { slug: "a-slug" }, method: "DELETE" }, res, vi.fn());

    expect(Notification.create).not.toHaveBeenCalled();
  });

  // Favoriting/unfavoriting itself always requires authentication (REQ-025);
  // AC-050 / AC-054's anonymous-viewer case (favorited forced false, count
  // still the true total) is exercised in articles.test.js's singleArticle
  // tests, since that's the endpoint anonymous visitors actually use.
});
