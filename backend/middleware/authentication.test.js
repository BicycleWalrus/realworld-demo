process.env.JWT_KEY = process.env.JWT_KEY || "test-jwt-key";

const { jwtSign } = require("../helper/jwt");
const { NotFoundError } = require("../helper/customErrors");
const { makeInstance, mockRequire } = require("../test-utils/fakeModels");

const User = { findOne: vi.fn() };
mockRequire(require.resolve("../models"), { User });

const verifyToken = require("./authentication");

function makeReq(authorization) {
  return { headers: authorization ? { authorization } : {} };
}

beforeEach(() => {
  User.findOne.mockReset();
});

describe("verifyToken", () => {
  // REQ-001: reads that support anonymous access proceed without a header.
  test("no Authorization header -> proceeds unauthenticated", async () => {
    const req = makeReq();
    const next = vi.fn();

    await verifyToken(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.loggedUser).toBeUndefined();
  });

  // REQ-002 / AC-065: a header with no space, or a trailing space and
  // nothing after it, is rejected as a generic (non-auth-specific) error.
  test.each(["not-a-bearer-token", "Bearer "])(
    "malformed Authorization header %p -> generic error, not a specific auth error",
    async (authorization) => {
      const req = makeReq(authorization);
      const next = vi.fn();

      await verifyToken(req, {}, next);

      expect(next).toHaveBeenCalledTimes(1);
      const error = next.mock.calls[0][0];
      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(NotFoundError);
    },
  );

  test("valid token for an existing account -> req.loggedUser is resolved", async () => {
    const account = makeInstance({ id: 1, username: "jane", email: "jane@x.com" });
    User.findOne.mockResolvedValue(account);
    const token = await jwtSign({ username: "jane", email: "jane@x.com" });
    const req = makeReq(`Bearer ${token}`);
    const next = vi.fn();

    await verifyToken(req, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.loggedUser).toBe(account);
    expect(req.loggedUser.dataValues.token).toBe(token);
    expect(req.headers.email).toBe("jane@x.com");
  });

  // REQ-041 / AC-068: an unverifiable signature is caught once and reported
  // once (contrast with the double-error case in REQ-005 below).
  test("token with an invalid signature -> next is called exactly once with a generic error", async () => {
    const req = makeReq("Bearer not.a.validtoken");
    const next = vi.fn();

    await verifyToken(req, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
  });

  // REQ-005 / AC-066: a signature that verifies but names no existing
  // account triggers a first NotFoundError report, then (without
  // returning) a second, unrelated crash from dereferencing the
  // unresolved user - both reach next(). The resulting HTTP status is not
  // something this test can confirm (see REQUIREMENTS.md REQ-005), so only
  // the documented double-call shape is asserted.
  test("valid signature but no matching account -> next is called twice", async () => {
    User.findOne.mockResolvedValue(null);
    const token = await jwtSign({ username: "ghost", email: "ghost@x.com" });
    const req = makeReq(`Bearer ${token}`);
    const next = vi.fn();

    await verifyToken(req, {}, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
    expect(next.mock.calls[1][0]).not.toBeInstanceOf(NotFoundError);
  });
});
