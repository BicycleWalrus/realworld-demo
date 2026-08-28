const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");
const { Op } = require("sequelize");

const User = { findOne: vi.fn(), findAndCountAll: vi.fn() };
mockRequire(require.resolve("../models"), { User });

const { getProfile, listProfiles, followToggler } = require("./profiles");

function makeArticle(usersCount) {
  return makeInstance({}, { countUsers: vi.fn().mockResolvedValue(usersCount) });
}

function makeProfile({
  articles = [],
  createdAt = "2024-01-15T00:00:00.000Z",
  hasFollower = false,
  followersCount = 0,
} = {}) {
  return makeInstance(
    { id: 1, username: "author", createdAt },
    {
      hasFollower: vi.fn().mockResolvedValue(hasFollower),
      countFollowers: vi.fn().mockResolvedValue(followersCount),
      addFollower: vi.fn().mockResolvedValue(),
      removeFollower: vi.fn().mockResolvedValue(),
      getArticles: vi.fn().mockResolvedValue(articles),
      get(key) {
        return this.dataValues[key];
      },
    },
  );
}

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  User.findOne.mockReset();
  User.findAndCountAll.mockReset();
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

  // AC-084, AC-085, AC-086: article count, favorites summed across the
  // author's articles, and member-since are attached — for a logged-in
  // viewer.
  test("logged-in viewer -> articleCount, summed favoritesCount, memberSince attached", async () => {
    const articles = [makeArticle(2), makeArticle(3), makeArticle(0)];
    const profile = makeProfile({
      articles,
      createdAt: "2023-06-01T00:00:00.000Z",
    });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await getProfile({ loggedUser, params: { username: "author" } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ profile });
    expect(profile.dataValues.articleCount).toBe(3);
    expect(profile.dataValues.favoritesCount).toBe(5); // 2 + 3 + 0
    expect(profile.dataValues.memberSince).toBe("2023-06-01T00:00:00.000Z");
  });

  // AC-084, AC-085, AC-086, AC-087: the same stats are attached, identically,
  // for an anonymous viewer — stats do not depend on `loggedUser`.
  test("anonymous viewer -> same articleCount, summed favoritesCount, memberSince attached", async () => {
    const articles = [makeArticle(4), makeArticle(1)];
    const profile = makeProfile({
      articles,
      createdAt: "2022-11-20T00:00:00.000Z",
    });
    User.findOne.mockResolvedValue(profile);
    const res = makeRes();

    await getProfile({ loggedUser: undefined, params: { username: "author" } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ profile });
    expect(profile.dataValues.articleCount).toBe(2);
    expect(profile.dataValues.favoritesCount).toBe(5); // 4 + 1
    expect(profile.dataValues.memberSince).toBe("2022-11-20T00:00:00.000Z");
  });
});

describe("listProfiles", () => {
  // AC-105: returns the paginated rows and total count from
  // User.findAndCountAll as { profiles, profilesCount }.
  test("returns profiles and profilesCount from User.findAndCountAll", async () => {
    const fakeProfiles = [makeInstance({ id: 1, username: "author" })];
    User.findAndCountAll.mockResolvedValue({ rows: fakeProfiles, count: 1 });
    const res = makeRes();

    await listProfiles({ query: {}, loggedUser: undefined }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ profiles: fakeProfiles, profilesCount: 1 });
  });

  // AC-105: default limit/offset (limit=10, offset=0) and email exclusion
  // when no pagination query params are supplied.
  test("defaults to limit=10, offset=0, and excludes email", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = makeRes();

    await listProfiles({ query: {}, loggedUser: undefined }, res, vi.fn());

    expect(User.findAndCountAll).toHaveBeenCalledWith({
      attributes: { exclude: ["email"] },
      limit: 10,
      offset: 0,
      order: [["username", "ASC"]],
    });
  });

  // AC-105: explicit limit/offset query params are parsed and passed through
  // (offset multiplied by limit, i.e. offset is a page number).
  test("passes explicit limit/offset through as parsed pagination", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = makeRes();

    await listProfiles({ query: { limit: "5", offset: "2" }, loggedUser: undefined }, res, vi.fn());

    expect(User.findAndCountAll).toHaveBeenCalledWith({
      attributes: { exclude: ["email"] },
      limit: 5,
      offset: 10,
      order: [["username", "ASC"]],
    });
  });

  // AC-106: works for an anonymous request (no loggedUser) — the directory
  // is readable without authentication.
  test("works with no loggedUser (anonymous)", async () => {
    const fakeProfiles = [makeInstance({ id: 1, username: "author" })];
    User.findAndCountAll.mockResolvedValue({ rows: fakeProfiles, count: 1 });
    const res = makeRes();

    await listProfiles({ query: {}, loggedUser: undefined }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ profiles: fakeProfiles, profilesCount: 1 });
  });

  // AC-110: a `username` query param adds a case-insensitive prefix filter
  // (reused by comment @mention autocomplete), additive to the existing
  // pagination options.
  test("username query param adds an Op.iLike prefix where", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = makeRes();

    await listProfiles({ query: { username: "jo" }, loggedUser: undefined }, res, vi.fn());

    expect(User.findAndCountAll).toHaveBeenCalledWith({
      attributes: { exclude: ["email"] },
      limit: 10,
      offset: 0,
      order: [["username", "ASC"]],
      where: { username: { [Op.iLike]: "jo%" } },
    });
  });

  // AC-105: omitting `username` keeps today's no-where behavior (REQ-074
  // must not regress when the new filter is unused).
  test("no username query param -> no where clause added", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = makeRes();

    await listProfiles({ query: {}, loggedUser: undefined }, res, vi.fn());

    expect(User.findAndCountAll).toHaveBeenCalledWith({
      attributes: { exclude: ["email"] },
      limit: 10,
      offset: 0,
      order: [["username", "ASC"]],
    });
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
