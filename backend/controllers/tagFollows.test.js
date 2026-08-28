const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Tag = { findByPk: vi.fn() };
mockRequire(require.resolve("../models"), { Tag });

const { followTag, getTag, unfollowTag } = require("./tagFollows");

function makeFollowerUser() {
  return makeInstance(
    { id: 1 },
    {
      addFollowedTag: vi.fn().mockResolvedValue(),
      hasFollowedTag: vi.fn().mockResolvedValue(false),
      removeFollowedTag: vi.fn().mockResolvedValue(),
    },
  );
}

beforeEach(() => {
  Tag.findByPk.mockReset();
});

describe("getTag", () => {
  // AC-154: the tag's follow state comes from the server, and is
  // simply false for an unauthenticated viewer.
  test("authenticated non-follower -> following false", async () => {
    Tag.findByPk.mockResolvedValue(makeInstance({ name: "dragons" }));
    const loggedUser = makeFollowerUser();
    const res = makeRes();

    await getTag({ loggedUser, params: { name: "dragons" } }, res, vi.fn());

    expect(loggedUser.hasFollowedTag).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ tag: { name: "dragons", following: false } });
  });

  test("follower -> following true", async () => {
    Tag.findByPk.mockResolvedValue(makeInstance({ name: "dragons" }));
    const loggedUser = makeFollowerUser();
    loggedUser.hasFollowedTag.mockResolvedValue(true);
    const res = makeRes();

    await getTag({ loggedUser, params: { name: "dragons" } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ tag: { name: "dragons", following: true } });
  });

  test("nonexistent tag -> NotFoundError", async () => {
    Tag.findByPk.mockResolvedValue(null);
    const next = vi.fn();

    await getTag({ loggedUser: undefined, params: { name: "missing" } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });
});

describe("followTag", () => {
  // AC-150: following requires authentication, like following a user
  // (REQ-027).
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await followTag({ loggedUser: undefined, params: { name: "dragons" } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("nonexistent tag -> NotFoundError", async () => {
    Tag.findByPk.mockResolvedValue(null);
    const next = vi.fn();

    await followTag(
      { loggedUser: makeFollowerUser(), params: { name: "missing" } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  test("adds the tag and reports following true", async () => {
    const tag = makeInstance({ name: "dragons" });
    Tag.findByPk.mockResolvedValue(tag);
    const loggedUser = makeFollowerUser();
    const res = makeRes();

    await followTag({ loggedUser, params: { name: "dragons" } }, res, vi.fn());

    expect(loggedUser.addFollowedTag).toHaveBeenCalledWith(tag);
    expect(res.json).toHaveBeenCalledWith({ tag: { name: "dragons", following: true } });
  });
});

describe("unfollowTag", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await unfollowTag({ loggedUser: undefined, params: { name: "dragons" } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("nonexistent tag -> NotFoundError", async () => {
    Tag.findByPk.mockResolvedValue(null);
    const next = vi.fn();

    await unfollowTag(
      { loggedUser: makeFollowerUser(), params: { name: "missing" } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  test("removes the tag and reports following false", async () => {
    const tag = makeInstance({ name: "dragons" });
    Tag.findByPk.mockResolvedValue(tag);
    const loggedUser = makeFollowerUser();
    const res = makeRes();

    await unfollowTag({ loggedUser, params: { name: "dragons" } }, res, vi.fn());

    expect(loggedUser.removeFollowedTag).toHaveBeenCalledWith(tag);
    expect(res.json).toHaveBeenCalledWith({ tag: { name: "dragons", following: false } });
  });
});
