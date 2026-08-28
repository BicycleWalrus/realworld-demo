process.env.JWT_KEY = process.env.JWT_KEY || "test-jwt-key";

const {
  AlreadyTakenError,
  FieldRequiredError,
  NotFoundError,
  ValidationError,
} = require("../helper/customErrors");
const { bcryptHash } = require("../helper/bcrypt");
const { makeInstance, makeRes, mockRequire } = require("../test-utils/fakeModels");

const User = { findOne: vi.fn(), create: vi.fn(), findAndCountAll: vi.fn() };
mockRequire(require.resolve("../models"), { User });

const { signUp, signIn, listUsers } = require("./users");

beforeEach(() => {
  User.findOne.mockReset();
  User.create.mockReset();
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

describe("listUsers", () => {
  const seedUsers = [
    makeInstance({ id: 1, username: "jane" }),
    makeInstance({ id: 2, username: "bob" }),
  ];

  // AC-7.1: unauthenticated request succeeds and excludes email/password.
  test("no query params -> returns users and usersCount, excluding email", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: seedUsers, count: 2 });
    const res = makeRes();

    await listUsers({ query: {} }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ users: seedUsers, usersCount: 2 });
    const queryArgs = User.findAndCountAll.mock.calls[0][0];
    expect(queryArgs.attributes).toEqual({ exclude: ["email"] });
  });

  // AC-7.2: default page size is 3, offset 0, ordered by username ascending.
  test("no query params -> defaults limit=3, offset=0, order by username ASC", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: seedUsers, count: 2 });

    await listUsers({ query: {} }, makeRes(), vi.fn());

    const queryArgs = User.findAndCountAll.mock.calls[0][0];
    expect(queryArgs.limit).toBe(3);
    expect(queryArgs.offset).toBe(0);
    expect(queryArgs.order).toEqual([["username", "ASC"]]);
  });

  test("limit and offset query params are applied", async () => {
    User.findAndCountAll.mockResolvedValue({ rows: seedUsers, count: 2 });

    await listUsers({ query: { limit: "5", offset: "2" } }, makeRes(), vi.fn());

    const queryArgs = User.findAndCountAll.mock.calls[0][0];
    expect(queryArgs.limit).toBe(5);
    expect(queryArgs.offset).toBe(10);
  });
});
