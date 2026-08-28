const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const User = { findOne: vi.fn(), findAndCountAll: vi.fn() };
mockRequire(require.resolve("../models"), { User });

const { listProfiles, getProfile, followToggler } = require("./profiles");

function makeProfile({ username = "author", hasFollower = false, followersCount = 0 } = {}) {
  return makeInstance(
    { id: 1, username },
    {
      hasFollower: vi.fn().mockResolvedValue(hasFollower),
      countFollowers: vi.fn().mockResolvedValue(followersCount),
      addFollower: vi.fn().mockResolvedValue(),
      removeFollower: vi.fn().mockResolvedValue(),
    },
  );
}

// Mirrors the real `findAndCountAll` shape used by allArticles' equivalent
// tests: sorts by username, then applies limit/offset, returning the true
// total count alongside the sliced page.
function fakeProfileList(seedRows) {
  return ({ limit, offset } = {}) => {
    let rows = [...seedRows].sort((a, b) => a.username.localeCompare(b.username));
    const count = rows.length;
    rows = rows.slice(offset, offset + limit);
    return Promise.resolve({ rows, count });
  };
}

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  User.findOne.mockReset();
  User.findAndCountAll.mockReset();
});

describe("listProfiles", () => {
  // AC-089: an anonymous caller sees following: false on every profile,
  // while each profile's follower count still reflects the true total.
  test("no loggedUser -> following forced false on every profile, followersCount true totals", async () => {
    const seed = [
      makeProfile({ username: "amy", hasFollower: true, followersCount: 2 }),
      makeProfile({ username: "bob", hasFollower: true, followersCount: 5 }),
    ];
    User.findAndCountAll.mockImplementation(fakeProfileList(seed));
    const res = makeRes();

    await listProfiles({ loggedUser: undefined, query: {} }, res, vi.fn());

    const { profiles } = res.json.mock.calls[0][0];
    expect(profiles.every((p) => p.dataValues.following === false)).toBe(true);
    expect(profiles.map((p) => p.dataValues.followersCount)).toEqual([2, 5]);
  });

  // AC-090: an authenticated caller's following flag is accurate per
  // profile, not forced to a single value across the whole list.
  test("loggedUser -> following flag reflects each profile independently", async () => {
    const seed = [
      makeProfile({ username: "amy", hasFollower: true, followersCount: 2 }),
      makeProfile({ username: "bob", hasFollower: false, followersCount: 5 }),
    ];
    User.findAndCountAll.mockImplementation(fakeProfileList(seed));
    const res = makeRes();

    await listProfiles({ loggedUser, query: {} }, res, vi.fn());

    const { profiles } = res.json.mock.calls[0][0];
    expect(profiles.map((p) => p.username)).toEqual(["amy", "bob"]);
    expect(profiles.map((p) => p.dataValues.following)).toEqual([true, false]);
  });

  // AC-091: with no explicit limit/offset, results are capped at 12 per
  // page, ordered by username ascending, while the count reflects every
  // matching profile.
  test("default pagination -> 12 per page, ordered by username, true total count", async () => {
    const seed = Array.from({ length: 13 }, (_, i) =>
      makeProfile({ username: `user${String(i).padStart(2, "0")}` }),
    );
    User.findAndCountAll.mockImplementation(fakeProfileList(seed));
    const res = makeRes();

    await listProfiles({ loggedUser: undefined, query: {} }, res, vi.fn());

    const { profiles, profilesCount } = res.json.mock.calls[0][0];
    expect(profilesCount).toBe(13);
    expect(profiles).toHaveLength(12);
    expect(profiles[0].username).toBe("user00");
  });
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
