# CLAUDE.md

Instructions for AI agents working in this repository.

## Project documentation contract

This is a legacy application. Before making changes, read, in order:

1. [`README.md`](./README.md) — the application's purpose.
2. [`REQUIREMENTS.md`](./REQUIREMENTS.md) — currently documented behavior
   (`REQ-###`).
3. [`USER_STORIES.md`](./USER_STORIES.md) — the user-facing goals behind
   that behavior (`US-###`).
4. [`ACCEPTANCE_CRITERIA.md`](./ACCEPTANCE_CRITERIA.md) — how current
   behavior is verified (`AC-###`).

Rules:

- Treat the existing, documented behavior as the current project contract
  unless a future task explicitly changes that contract.
- Do not change application behavior merely because the existing
  implementation appears awkward, repetitive, or outdated.
- Distinguish observed behavior from assumptions about intended behavior;
  don't state the latter as fact.
- During refactoring, preserve existing behavior unless an approved
  requirement explicitly changes it.
- Prefer small, reviewable changes.
- Do not introduce undocumented features.

## Git / GitHub workflow

For anything involving git branches, commits, or Pull Requests — branch
naming conventions, how to commit, how to push, how to open a PR, and the
agent-specific checklist for doing so — see [GITHUB.md](./GITHUB.md).

Read it before creating a branch, committing, pushing, or opening a PR in
this repo.
