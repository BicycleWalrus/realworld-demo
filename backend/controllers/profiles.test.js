const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const User = { findOne: vi.fn() };
mockRequire(require.resolve("../models"), { User });

const { getProfile, followToggler } = require("./profiles");

function makeProfile({
  hasFollower = false,
  followersCount = 0,
  articles = [],
  createdAt = "2020-01-01T00:00:00.000Z",
} = {}) {
  return makeInstance(
    { id: 1, username: "author", createdAt },
    {
      hasFollower: vi.fn().mockResolvedValue(hasFollower),
      countFollowers: vi.fn().mockResolvedValue(followersCount),
      addFollower: vi.fn().mockResolvedValue(),
      removeFollower: vi.fn().mockResolvedValue(),
      getArticles: vi.fn().mockResolvedValue(articles),
    },
  );
}

function makeArticle(favoritesCount) {
  return { countUsers: vi.fn().mockResolvedValue(favoritesCount) };
}

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  User.findOne.mockReset();
});

describe("getProfile", () => {
  test("nonexistent username -> NotFoundError", async () => {
    User.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await getProfile({ loggedUser: undefined, params: { username: "ghost" } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-006 / AC-054: an anonymous viewer sees following: false, but the
  // follower count still reflects the true total.
  test("no loggedUser -> following forced false, followersCount is the true total", async () => {
    const profile = makeProfile({ hasFollower: true, followersCount: 5 });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await getProfile({ loggedUser: undefined, params: { username: "author" } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ profile });
    expect(profile.dataValues.following).toBe(false);
    expect(profile.dataValues.followersCount).toBe(5);
  });

  // AC: article count, total favorites (summed across articles), and
  // member-since date are attached to the profile response.
  // AC-107, AC-108
  test("attaches article count, total favorites across all articles, and member-since date", async () => {
    const profile = makeProfile({
      articles: [makeArticle(3), makeArticle(0), makeArticle(2)],
      createdAt: "2019-06-15T00:00:00.000Z",
    });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await getProfile({ loggedUser: undefined, params: { username: "author" } }, res, vi.fn());

    expect(profile.dataValues.articleCount).toBe(3);
    expect(profile.dataValues.totalFavoritesCount).toBe(5);
    expect(profile.dataValues.memberSince).toBe("2019-06-15T00:00:00.000Z");
  });

  // Zero-state: an author with no articles yet.
  // AC-107
  test("author with no articles -> articleCount and totalFavoritesCount are 0", async () => {
    const profile = makeProfile({ articles: [] });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await getProfile({ loggedUser: undefined, params: { username: "author" } }, res, vi.fn());

    expect(profile.dataValues.articleCount).toBe(0);
    expect(profile.dataValues.totalFavoritesCount).toBe(0);
  });

  // Stats must be visible to anonymous and authenticated visitors alike.
  // AC-109
  test("stats are attached the same way for an authenticated viewer", async () => {
    const profile = makeProfile({ articles: [makeArticle(1)] });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await getProfile({ loggedUser, params: { username: "author" } }, res, vi.fn());

    expect(profile.dataValues.articleCount).toBe(1);
    expect(profile.dataValues.totalFavoritesCount).toBe(1);
  });
});

describe("followToggler", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await followToggler({ loggedUser: undefined, params: {}, method: "POST" }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-053: following/unfollowing a nonexistent username is rejected.
  test("nonexistent username -> NotFoundError", async () => {
    User.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await followToggler({ loggedUser, params: { username: "ghost" }, method: "POST" }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-051: following an account not already followed.
  test("POST on a not-yet-followed account -> addFollower called, following true", async () => {
    const profile = makeProfile({ hasFollower: true, followersCount: 3 });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await followToggler({ loggedUser, params: { username: "author" }, method: "POST" }, res, vi.fn());

    expect(profile.addFollower).toHaveBeenCalledWith(loggedUser);
    expect(profile.dataValues.following).toBe(true);
    expect(profile.dataValues.followersCount).toBe(3);
  });

  // AC-052: unfollowing a currently-followed account.
  test("DELETE on a followed account -> removeFollower called, following false", async () => {
    const profile = makeProfile({ hasFollower: false, followersCount: 2 });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await followToggler({ loggedUser, params: { username: "author" }, method: "DELETE" }, res, vi.fn());

    expect(profile.removeFollower).toHaveBeenCalledWith(loggedUser);
    expect(profile.dataValues.following).toBe(false);
    expect(profile.dataValues.followersCount).toBe(2);
  });
});
