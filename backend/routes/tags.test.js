const { makeRes, mockRequire } = require("../test-utils/fakeModels");

const Tag = { findAll: vi.fn() };
mockRequire(require.resolve("../models"), { Tag });

// REQ-089: routes/tags.js now also wires verifyToken (for the follow/
// unfollow/followed routes below), whose real implementation transitively
// requires the `jsonwebtoken`/`jwa` chain, which crashes at import time in
// this environment (same pre-existing crash as backend/controllers/
// users.test.js and backend/middleware/authentication.test.js). Mocking it
// out here only avoids that unrelated import-time crash - the GET /
// handler under test below never calls verifyToken.
mockRequire(require.resolve("../middleware/authentication"), (req, res, next) => next());

const router = require("./tags");

// The route handler is defined inline on the router rather than exported as
// a standalone function; pulling it off the Express layer is the only way
// to invoke the real handler directly without a running server.
const handler = router.stack[0].route.stack[0].handle;

beforeEach(() => {
  Tag.findAll.mockReset();
});

describe("GET /api/tags", () => {
  // AC-005 / AC-039: tags are returned without authentication and without
  // any server-side pagination cap (the 50-tag cap is client-only - see
  // frontend PopularTags tests).
  test("returns the full tag list, unpaginated", async () => {
    const tags = Array.from({ length: 60 }, (_, i) => ({ name: `tag-${i}` }));
    Tag.findAll.mockResolvedValue(tags);
    const res = makeRes();

    await handler({}, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ tags: tags.map((t) => t.name) });
  });
});
