process.env.JWT_KEY = process.env.JWT_KEY || "test-jwt-key";

const { Op } = require("sequelize");
const {
  AlreadyTakenError,
  FieldRequiredError,
  NotFoundError,
  ValidationError,
} = require("../helper/customErrors");
const { bcryptHash } = require("../helper/bcrypt");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const User = {
  findOne: vi.fn(),
  create: vi.fn(),
  findAll: vi.fn(),
  findAndCountAll: vi.fn(),
};
mockRequire(require.resolve("../models"), { User });

const { signUp, signIn, searchUsers, verifyUsernames, directory } = require("./users");

beforeEach(() => {
  User.findOne.mockReset();
  User.create.mockReset();
  User.findAll.mockReset();
  User.findAndCountAll.mockReset();
});

describe("signUp", () => {
  // AC-007: missing username, email, or password is rejected, naming the
  // first missing field in that order.
  test.each([
    [{ email: "a@x.com", password: "pw" }, "username"],
    [{ username: "jane", password: "pw" }, "email"],
    [{ username: "jane", email: "a@x.com" }, "password"],
  ])("missing field %o -> field-required error naming %s", async (user, expectedField) => {
    const next = vi.fn();

    await signUp({ body: { user } }, makeRes(), next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(FieldRequiredError);
    expect(error.message.toLowerCase()).toContain(expectedField);
    expect(User.create).not.toHaveBeenCalled();
  });

  // AC-008: a duplicate email is rejected and no account is created.
  test("email already registered -> AlreadyTakenError, no account created", async () => {
    User.findOne.mockResolvedValue(makeInstance({ id: 1, email: "a@x.com" }));
    const next = vi.fn();

    await signUp(
      { body: { user: { username: "jane", email: "a@x.com", password: "pw" } } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(AlreadyTakenError);
    expect(User.create).not.toHaveBeenCalled();
  });

  // AC-009: a valid, unique registration creates the account and returns a token.
  test("valid unique registration -> 201 with user and token", async () => {
    User.findOne.mockResolvedValue(null);
    const created = makeInstance({ id: 1, username: "jane", email: "a@x.com" });
    User.create.mockResolvedValue(created);
    const res = makeRes();

    await signUp(
      { body: { user: { username: "jane", email: "a@x.com", password: "pw" } } },
      res,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ user: created });
    expect(created.dataValues.token).toEqual(expect.any(String));
  });
});

describe("signIn", () => {
  // AC-010: an email with no matching account is rejected as not-found.
  test("unknown email -> NotFoundError", async () => {
    User.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await signIn({ body: { user: { email: "nope@x.com", password: "pw" } } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-011: a known email with the wrong password gets a single generic
  // error that does not say which field was wrong.
  test("known email, wrong password -> generic wrong-credentials error", async () => {
    const storedHash = await bcryptHash("correct-password");
    User.findOne.mockResolvedValue(makeInstance({ id: 1, email: "a@x.com", password: storedHash }));
    const next = vi.fn();

    await signIn({ body: { user: { email: "a@x.com", password: "wrong-password" } } }, makeRes(), next);

    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.message).toBe("Wrong email/password combination");
  });

  // AC-012: correct credentials return the account and a session token.
  test("matching email and password -> user and token returned", async () => {
    const storedHash = await bcryptHash("correct-password");
    const existentUser = makeInstance({ id: 1, username: "jane", email: "a@x.com", password: storedHash });
    User.findOne.mockResolvedValue(existentUser);
    const res = makeRes();

    await signIn({ body: { user: { email: "a@x.com", password: "correct-password" } } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ user: existentUser });
    expect(existentUser.dataValues.token).toEqual(expect.any(String));
  });
});

describe("searchUsers", () => {
  // AC: a search term returns matching usernames.
  test("search term -> matching usernames returned", async () => {
    User.findAll.mockResolvedValue([
      makeInstance({ username: "jane" }),
      makeInstance({ username: "janet" }),
    ]);
    const res = makeRes();

    await searchUsers({ query: { search: "jan" } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ users: ["jane", "janet"] });
  });

  // AC: no matching usernames -> empty list, not an error.
  test("no matches -> empty list", async () => {
    User.findAll.mockResolvedValue([]);
    const res = makeRes();

    await searchUsers({ query: { search: "zzz" } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ users: [] });
  });

  // AC: an empty/missing search term short-circuits to an empty list
  // without ever querying the database - this endpoint never returns the
  // full user directory.
  test("missing search term -> empty list, no query made", async () => {
    const res = makeRes();

    await searchUsers({ query: {} }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ users: [] });
    expect(User.findAll).not.toHaveBeenCalled();
  });
});

describe("verifyUsernames", () => {
  // Exact-match batch lookup, distinct from searchUsers' prefix match -
  // used to confirm real @mention candidates without an unordered,
  // capped prefix result starving out the exact username being checked.
  test("returns only the usernames that actually exist", async () => {
    User.findAll.mockResolvedValue([makeInstance({ username: "bob" })]);
    const res = makeRes();

    await verifyUsernames({ query: { usernames: "bob,ghost" } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ users: ["bob"] });
  });

  test("missing usernames param -> empty list, no query made", async () => {
    const res = makeRes();

    await verifyUsernames({ query: {} }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ users: [] });
    expect(User.findAll).not.toHaveBeenCalled();
  });

  test("caps the batch at 20 usernames", async () => {
    User.findAll.mockResolvedValue([]);
    const res = makeRes();
    const usernames = Array.from({ length: 30 }, (_, i) => `user${i}`).join(",");

    await verifyUsernames({ query: { usernames } }, res, vi.fn());

    const [{ where }] = User.findAll.mock.calls[0];
    expect(where[Op.or]).toHaveLength(20);
  });
});

describe("directory", () => {
  test("returns a paginated page of users with only username, image, and bio", async () => {
    User.findAndCountAll.mockResolvedValue({
      rows: [makeInstance({ username: "jane", image: null, bio: "hi" })],
      count: 1,
    });
    const res = makeRes();

    await directory({ query: {} }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({
      users: [expect.objectContaining({ username: "jane" })],
      usersCount: 1,
    });
    const [{ attributes }] = User.findAndCountAll.mock.calls[0];
    expect(attributes).toEqual(["username", "image", "bio"]);
  });

  test("does not require authentication (no loggedUser check)", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = makeRes();

    await directory({ query: {} }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ users: [], usersCount: 0 });
  });

  test("applies limit and offset from the query, defaulting to page size 20", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = makeRes();

    await directory({ query: { limit: "5", offset: "2" } }, res, vi.fn());

    const [{ limit, offset }] = User.findAndCountAll.mock.calls[0];
    expect(limit).toBe(5);
    expect(offset).toBe(10);
  });

  test("defaults to a page size of 20 when no limit is given", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = makeRes();

    await directory({ query: {} }, res, vi.fn());

    const [{ limit }] = User.findAndCountAll.mock.calls[0];
    expect(limit).toBe(20);
  });

  // No-auth, full-table-enumeration endpoint - a huge, negative, or
  // non-numeric limit/offset must not reach the database unclamped.
  test("clamps an oversized limit instead of dumping the whole table in one request", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = makeRes();

    await directory({ query: { limit: "999999" } }, res, vi.fn());

    const [{ limit }] = User.findAndCountAll.mock.calls[0];
    expect(limit).toBe(100);
  });

  test("falls back to the default for a non-numeric or negative limit", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await directory({ query: { limit: "abc" } }, makeRes(), vi.fn());
    expect(User.findAndCountAll.mock.calls[0][0].limit).toBe(20);

    await directory({ query: { limit: "-5" } }, makeRes(), vi.fn());
    expect(User.findAndCountAll.mock.calls[1][0].limit).toBe(20);
  });

  test("falls back to offset 0 for a non-numeric or negative offset", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await directory({ query: { offset: "abc" } }, makeRes(), vi.fn());
    expect(User.findAndCountAll.mock.calls[0][0].offset).toBe(0);

    await directory({ query: { offset: "-1" } }, makeRes(), vi.fn());
    expect(User.findAndCountAll.mock.calls[1][0].offset).toBe(0);
  });
});
