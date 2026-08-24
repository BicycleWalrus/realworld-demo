const errorHandler = require("./errorHandler");
const {
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  FieldRequiredError,
  AlreadyTakenError,
} = require("../helper/customErrors");
const { makeRes } = require("../test-utils/fakeModels");

// REQ-037: the server maps each recognized error category to a specific
// HTTP status code; anything else (including plain validation subclasses,
// which all extend ValidationError) falls through to 500.
describe("errorHandler", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const cases = [
    [new UnauthorizedError(), 401],
    [new ForbiddenError("article"), 403],
    [new NotFoundError("Article"), 404],
    [new ValidationError("bad input"), 422],
    [new FieldRequiredError("A title"), 422],
    [new AlreadyTakenError("Email"), 422],
    [new Error("unexpected"), 500],
    [new SyntaxError("Token missing or malformed"), 500],
  ];

  test.each(cases)("%o -> %i", (error, status) => {
    const res = makeRes();

    errorHandler(error, {}, res, () => {});

    expect(res.status).toHaveBeenCalledWith(status);
    expect(res.json).toHaveBeenCalledWith({
      errors: { body: [error.message] },
    });
  });
});
