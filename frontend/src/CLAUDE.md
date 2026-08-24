# CLAUDE.md — src/

Additional guidance for working inside this legacy source tree. This
supplements, and does not repeat, the root [`CLAUDE.md`](../../CLAUDE.md) —
read that first.

## Working with this code

- Every file here implements behavior already documented in
  `REQUIREMENTS.md` (`REQ-###`) and verified via `ACCEPTANCE_CRITERIA.md`
  (`AC-###`). Before changing a file, find the requirement(s) and
  acceptance criteria it satisfies, if any exist and treat them as the
  contract for that code, not the implementation itself.
- If a change touches behavior with no corresponding `REQ-###`/`AC-###`,
  do not assume it's a bug or gap to fix silently — flag it and confirm
  scope before proceeding.
- Do not change observable behavior (API responses, validation order,
  error types, rendered output, etc.) unless a task explicitly approves a
  documented requirement change. "This looks wrong" or "this looks
  outdated" is not sufficient justification on its own.

## Refactoring vs. behavior changes

- Never combine a refactor with a behavior change in the same edit or
  commit. If a refactor reveals a desired behavior change, do the refactor
  first (behavior-preserving, verified against the relevant `AC-###`),
  then propose the behavior change separately.
- Keep changes small enough to review independently — prefer several
  narrowly scoped edits over one broad one, even when they touch related
  code.

## Abstractions

- Don't introduce new shared utilities, base classes, hooks, or other
  abstractions to "clean up" existing duplication unless a current task
  specifically requires it. Matching the existing (even repetitive) style
  is preferred over speculative generalization.

## Verifying changes

- After any change in this tree, identify the `AC-###` entries that cover
  the touched code path and confirm they still hold (via existing tests
  or manual verification). Treat a broken acceptance criterion as a
  regression to fix, not a criterion to update.
