const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Tag = { findAll: vi.fn(), findByPk: vi.fn() };
mockRequire(require.resolve("../models"), { Tag });

const { allTags, tagFollowToggler } = require("./tags");

function makeTag({ name = "dragons", hasFollower = false } = {}) {
  return makeInstance(
    { name },
    {
      hasFollower: vi.fn().mockResolvedValue(hasFollower),
      addFollower: vi.fn().mockResolvedValue(),
      removeFollower: vi.fn().mockResolvedValue(),
    },
  );
}

const loggedUser = makeInstance({ id: 2, username: "reader" });

beforeEach(() => {
  Tag.findAll.mockReset();
  Tag.findByPk.mockReset();
});

describe("allTags", () => {
  // AC-005 / AC-039: the tag list is returned without authentication.
  test("no loggedUser -> tags returned with followed forced false", async () => {
    const tags = [makeTag({ name: "dragons", hasFollower: true }), makeTag({ name: "training" })];
    Tag.findAll.mockResolvedValue(tags);
    const res = makeRes();

    await allTags({ loggedUser: undefined }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ tags });
    expect(tags[0].dataValues.followed).toBe(false);
    expect(tags[1].dataValues.followed).toBe(false);
  });

  // AC-120/AC-121 (viewer half): an authenticated viewer sees their real
  // per-tag followed status.
  test("logged-in viewer -> followed reflects their real per-tag status", async () => {
    const tags = [makeTag({ name: "dragons", hasFollower: true }), makeTag({ name: "training" })];
    Tag.findAll.mockResolvedValue(tags);
    const res = makeRes();

    await allTags({ loggedUser }, res, vi.fn());

    expect(tags[0].dataValues.followed).toBe(true);
    expect(tags[1].dataValues.followed).toBe(false);
  });
});

describe("tagFollowToggler", () => {
  // AC-118: an unauthenticated request to follow/unfollow a tag is rejected.
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await tagFollowToggler({ loggedUser: undefined, params: {}, method: "POST" }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-119: a nonexistent tag name is rejected.
  test("nonexistent tag name -> NotFoundError", async () => {
    Tag.findByPk.mockResolvedValue(null);
    const next = vi.fn();

    await tagFollowToggler(
      { loggedUser, params: { name: "ghost" }, method: "POST" },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-120: following a tag not yet followed.
  test("POST on a not-yet-followed tag -> addFollower called, followed true", async () => {
    const tag = makeTag({ hasFollower: true });
    Tag.findByPk.mockResolvedValue(tag);
    const res = makeRes();

    await tagFollowToggler({ loggedUser, params: { name: "dragons" }, method: "POST" }, res, vi.fn());

    expect(tag.addFollower).toHaveBeenCalledWith(loggedUser);
    expect(tag.dataValues.followed).toBe(true);
    expect(res.json).toHaveBeenCalledWith({ tag });
  });

  // AC-121: unfollowing a currently-followed tag.
  test("DELETE on a followed tag -> removeFollower called, followed false", async () => {
    const tag = makeTag({ hasFollower: false });
    Tag.findByPk.mockResolvedValue(tag);
    const res = makeRes();

    await tagFollowToggler({ loggedUser, params: { name: "dragons" }, method: "DELETE" }, res, vi.fn());

    expect(tag.removeFollower).toHaveBeenCalledWith(loggedUser);
    expect(tag.dataValues.followed).toBe(false);
  });
});
