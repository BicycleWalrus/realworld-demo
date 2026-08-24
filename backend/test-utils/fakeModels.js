// Test-only helpers for building fake Sequelize-instance-shaped objects.
// No database is involved: controllers are exercised directly, with the
// `../models` module mocked per test file. These fakes mimic just enough of
// the Sequelize instance API (a `dataValues` bag with proxying top-level
// getters/setters, plus whatever association methods a test needs) for the
// real, unmocked controller and helper code to run unchanged against them.

function makeInstance(data = {}, methods = {}) {
  const instance = { dataValues: { ...data } };

  for (const key of Object.keys(data)) {
    Object.defineProperty(instance, key, {
      get: () => instance.dataValues[key],
      set: (value) => {
        instance.dataValues[key] = value;
      },
      enumerable: true,
      configurable: true,
    });
  }

  return Object.assign(instance, methods);
}

// Mirrors what `res.json(instance)` would actually send: Sequelize instances
// serialize to their `dataValues`, recursively for nested associations.
function toPlainJSON(value) {
  if (Array.isArray(value)) return value.map(toPlainJSON);

  if (value && typeof value === "object" && value.dataValues) {
    const plain = {};
    for (const [key, val] of Object.entries(value.dataValues)) {
      plain[key] = toPlainJSON(val);
    }
    return plain;
  }

  return value;
}

function makeRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

// Vitest's `vi.mock` only intercepts statically-analyzed `import`s; this
// legacy backend loads its dependencies with plain CJS `require()`, which
// bypasses that registry entirely. Pre-seeding Node's own module cache for
// an already-resolved path (via `require.resolve(...)` in the caller, whose
// relative path must be resolved from the caller's own location) is what
// actually intercepts a source file's internal `require("../models")`.
function mockRequire(resolvedPath, exportsObj) {
  require.cache[resolvedPath] = {
    id: resolvedPath,
    filename: resolvedPath,
    loaded: true,
    exports: exportsObj,
  };
}

module.exports = { makeInstance, toPlainJSON, makeRes, mockRequire };
