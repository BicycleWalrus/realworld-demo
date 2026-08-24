# CLAUDE.md — tests

Additional guidance for writing and running tests in this repository. This
supplements, and does not repeat, the root [`CLAUDE.md`](../CLAUDE.md) —
read that first.

Tests in this codebase live alongside the code they cover (e.g.
`backend/helper/helpers.test.js`,
`frontend/src/helpers/dateFormatter.test.js`), run via `vitest`. This
guidance applies to all of them regardless of location.

## What existing tests mean

- An existing, passing test is evidence of current, documented behavior —
  not an implementation detail to work around. If a test looks wrong or
  overly specific, check `REQUIREMENTS.md` (`REQ-###`) and
  `ACCEPTANCE_CRITERIA.md` (`AC-###`) before assuming it's mistaken.
- Never edit or delete an existing test just to make it pass after a
  change, unless the change is an approved, explicit behavior change and
  the corresponding `REQ-###`/`AC-###` has been updated to match.

## Determining expected behavior for a new test

- Base new tests on `REQUIREMENTS.md` and `ACCEPTANCE_CRITERIA.md`, not on
  what seems "correct" or convenient. When a `REQ-###`/`AC-###` exists for
  the behavior under test, cite it (in a comment or the test description)
  and assert exactly what it describes.
- If no requirement or acceptance criterion covers the behavior you're
  about to test, that's a signal to confirm scope before writing the test
  — don't infer intended behavior and encode it as if it were documented.

## Characterizing vs. specifying

- A test written against existing, undocumented-but-observed behavior
  (a characterization test) should say so — e.g. "documents current
  behavior" rather than implying it's a deliberate requirement. Don't
  frame a characterization test as validating a new requirement.
- A test for behavior introduced or changed by an approved task should be
  written against the new/updated `REQ-###`/`AC-###`, and should be
  clearly distinguishable from characterization tests of pre-existing
  code.

## Never change application behavior to satisfy a test

- If a newly written test fails against the current implementation,
  that's a conflict to resolve by revisiting the test's expectations
  against `REQUIREMENTS.md`/`ACCEPTANCE_CRITERIA.md` — not a reason to
  change source code, unless a behavior change was the explicit, approved
  goal of the task.

## Style

- Test observable behavior (inputs/outputs, thrown errors, response
  shapes) through the same interface real callers use — not internal
  state or private implementation details. See the existing helper tests
  for the expected shape: a plain `describe`/`test`/`it` with a small,
  literal set of inputs (`test.each` where a table of cases makes sense).
- Keep tests small and readable: one behavior per test, minimal setup, no
  shared mutable fixtures or abstractions beyond what's needed to express
  the case clearly.
