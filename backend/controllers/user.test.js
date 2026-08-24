const { UnauthorizedError } = require("../helper/customErrors");
const { bcryptCompare } = require("../helper/bcrypt");
const { makeInstance, makeRes } = require("../test-utils/fakeModels");
const { currentUser, updateUser } = require("./user");

describe("currentUser", () => {
  // AC-015 / AC-058: no resolved user -> authentication-required error.
  // (errorHandler.test.js separately confirms UnauthorizedError -> 401.)
  test("no loggedUser -> UnauthorizedError passed to next", async () => {
    const next = vi.fn();

    await currentUser({ loggedUser: undefined, headers: {} }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-016: the returned email comes from the session token, not the
  // stored account row (which the fake here deliberately differs from).
  test("returns the email carried on the token, not the stored row's email", async () => {
    const loggedUser = makeInstance({ id: 1, username: "jane", email: "stale@db.com" });
    const req = { loggedUser, headers: { email: "fresh@token.com" } };
    const res = makeRes();

    await currentUser(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ user: loggedUser });
    expect(loggedUser.dataValues.email).toBe("fresh@token.com");
  });
});

describe("updateUser", () => {
  test("no loggedUser -> UnauthorizedError passed to next", async () => {
    const next = vi.fn();

    await updateUser({ loggedUser: undefined, body: { user: {} } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-017: each submitted field is applied, except a field submitted as
  // `undefined`, which is left unchanged.
  test("undefined fields are left unchanged; provided fields are applied", async () => {
    const loggedUser = makeInstance(
      { username: "old", email: "old@x.com", bio: "old bio", image: "old.png", password: "hash" },
      { save: vi.fn().mockResolvedValue() },
    );
    const req = {
      loggedUser,
      body: { user: { username: "new", bio: "new bio", email: undefined, image: undefined, password: "" } },
    };

    await updateUser(req, makeRes(), vi.fn());

    expect(loggedUser.username).toBe("new");
    expect(loggedUser.bio).toBe("new bio");
    expect(loggedUser.email).toBe("old@x.com");
    expect(loggedUser.image).toBe("old.png");
    expect(loggedUser.save).toHaveBeenCalled();
  });

  // AC-018: there is no submitted password value that leaves the stored
  // hash unchanged - even an empty string is hashed and saved.
  test("password field is always re-hashed and saved, even as an empty string", async () => {
    const loggedUser = makeInstance(
      { username: "jane", password: "original-hash" },
      { save: vi.fn().mockResolvedValue() },
    );
    const req = { loggedUser, body: { user: { username: "jane", password: "" } } };

    await updateUser(req, makeRes(), vi.fn());

    expect(loggedUser.password).not.toBe("original-hash");
    await expect(bcryptCompare("", loggedUser.password)).resolves.toBe(true);
  });
});
