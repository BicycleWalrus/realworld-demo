const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Tag = { findByPk: vi.fn() };
mockRequire(require.resolve("../models"), { Tag });

const { tagFollowToggler, followedTags } = require("./tagFollows");

function makeTag(overrides = {}) {
  return makeInstance({ name: "javascript", ...overrides });
}

function makeUser(overrides = {}) {
  return makeInstance(
    { id: 1, username: "reader", ...overrides },
    {
      addFollowedTag: vi.fn().mockResolvedValue(),
      removeFollowedTag: vi.fn().mockResolvedValue(),
      getFollowedTags: vi.fn().mockResolvedValue([]),
    },
  );
}

beforeEach(() => {
  Tag.findByPk.mockReset();
});

describe("tagFollowToggler", () => {
  // AC-120: following/unfollowing a tag requires authentication.
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await tagFollowToggler(
      { loggedUser: undefined, params: { name: "javascript" }, method: "POST" },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-120: the target tag must exist.
  test("nonexistent tag name -> NotFoundError", async () => {
    Tag.findByPk.mockResolvedValue(null);
    const loggedUser = makeUser();
    const next = vi.fn();

    await tagFollowToggler(
      { loggedUser, params: { name: "ghost" }, method: "POST" },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
    expect(loggedUser.addFollowedTag).not.toHaveBeenCalled();
  });

  // AC-120: following a tag.
  test("POST -> addFollowedTag called, response following:true", async () => {
    const tag = makeTag();
    Tag.findByPk.mockResolvedValue(tag);
    const loggedUser = makeUser();
    const res = makeRes();

    await tagFollowToggler(
      { loggedUser, params: { name: "javascript" }, method: "POST" },
      res,
      vi.fn(),
    );

    expect(loggedUser.addFollowedTag).toHaveBeenCalledWith(tag);
    expect(loggedUser.removeFollowedTag).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ tag: { name: "javascript" }, following: true });
  });

  // AC-120: unfollowing a previously-followed tag.
  test("DELETE -> removeFollowedTag called, response following:false", async () => {
    const tag = makeTag();
    Tag.findByPk.mockResolvedValue(tag);
    const loggedUser = makeUser();
    const res = makeRes();

    await tagFollowToggler(
      { loggedUser, params: { name: "javascript" }, method: "DELETE" },
      res,
      vi.fn(),
    );

    expect(loggedUser.removeFollowedTag).toHaveBeenCalledWith(tag);
    expect(loggedUser.addFollowedTag).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ tag: { name: "javascript" }, following: false });
  });
});

describe("followedTags", () => {
  // AC-120: retrieving followed tags requires authentication.
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await followedTags({ loggedUser: undefined }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-120: returns the requesting user's own followed tag names.
  test("with loggedUser -> returns followed tag names", async () => {
    const loggedUser = makeUser();
    loggedUser.getFollowedTags.mockResolvedValue([makeTag({ name: "javascript" }), makeTag({ name: "react" })]);
    const res = makeRes();

    await followedTags({ loggedUser }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ tags: ["javascript", "react"] });
  });
});
