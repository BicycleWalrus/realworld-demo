# GAPS.md — Advanced Course Readiness

Staging ground for planning the implementation work needed before this repo
can support the "Claude Code for Engineers – Advanced" course. Findings from
comparing the course summary against the actual state of the repo on
2026-08-26. Not a spec — each gap below needs its own design/decision pass
before implementation starts.

## Context

The course description promises participants a repository with:
"pre-authorized MCP servers, existing subagents and Skills, configured
hooks, and automated PR review" in place before the kickoff briefing, plus
learning outcomes built on diagnosing issues via "application code, database
schema, and logs together."

Of that list, only **subagents** are actually present
(`.claude/agents/code-reviewer.md`, `.claude/agents/test-runner.md`).
Everything else below is missing or partial.

## Gaps

### 1. No MCP servers configured — **COMPLETED**

- **Current state:** no `.mcp.json` anywhere in the repo.
- **Course claim:** "pre-authorized MCP servers," used "under limited,
  read-mostly credentials without exposing production systems."
- **Why it matters:** this is the biggest gap. The day's diagnostic
  workflow ("issue context, schema, logs, and source files") implies MCP
  access to something like the database, a ticket tracker, or a log store.
  Without it, that learning outcome has no mechanism.
- **To plan:** which MCP servers to stand up (DB read access? issue
  tracker? log query tool?), what credentials/scopes to pre-authorize, and
  how to keep them read-mostly against a non-production instance.
- **Proposal:** see [`PROPOSAL-MCP.md`](./PROPOSAL-MCP.md) — a single
  read-only Postgres MCP server against the existing local dev DB, kept
  deliberately minor rather than a centerpiece of the day. **Feasibility
  verified live** against the repo's actual local Postgres container:
  DB-level read-only role tested and holds independent of the MCP layer,
  candidate package (`@ahmetkca/mcp-server-postgres@1.2.0`) installs via
  plain `npx`/npm with no build step and was confirmed end-to-end over
  real MCP stdio calls.
- **Implemented and required, not optional.** `db/init/01-mcp-readonly-role.sql`,
  `docker-compose.yml`'s init-script mount, the pinned `package.json`
  dependency plus `npm run db:mcp-role` fallback, `.mcp.json`, and the
  README setup step are all in place and verified end-to-end — including
  the fresh-volume auto-provisioning path (tested with a disposable
  container) and the read-only enforcement holding at the database level
  regardless of what the MCP tool itself claims. Tracked as
  `REQUIREMENTS.md` REQ-047/REQ-048, `USER_STORIES.md` US-028, and
  `ACCEPTANCE_CRITERIA.md` AC-076–AC-079 — no longer marked pending.
  [`INIT.md`](./INIT.md) is now the canonical, agent-executable
  initialization procedure covering the whole setup (app + MCP as one
  required flow, not a bolted-on extra), with `README.md` pointing AI
  agents at it instead of the manual walkthrough. Because Claude Code only
  reads `.mcp.json`/its env vars at its own startup, `INIT.md`'s last step
  has the initializing agent tell the user to close and relaunch Claude
  Code to actually gain access to the server.

### 2. No Skills in the repo — **COMPLETED**

- **Current state:** no `.claude/skills/` directory.
- **Course claim:** outline says participants will "use or extend the
  project's existing Skills."
- **Why it matters:** there is nothing to use or extend.
- **To plan:** what Skill(s) would plausibly exist in a legacy codebase
  like this one (e.g. a "run the app" skill, a "generate a
  REQ/US/AC entry" skill, a migration-authoring skill) and are worth
  building for participants to discover and extend mid-task.
- **Implemented.** `.claude/skills/req-doc/SKILL.md` drafts the matching
  `REQ-###`/`US-###`/`AC-###` entries (and Traceability Matrix row) for a
  behavior change just made or described, following this repo's exact
  numbering/cross-reference/formatting conventions — the task every
  `ISSUES.md` ticket's Definition of Done (item 3) requires. Verified via
  a dry run against a real, currently-undocumented backend behavior
  (unrestricted CORS): output was correctly numbered (`max+1` per file),
  correctly cross-referenced, matched the house style, appended without
  altering any existing entry, and staged/committed nothing.

### 3. No hooks configured

- **Current state:** no `settings.json` / hooks anywhere under `.claude/`.
- **Course claim:** outline says participants will "apply... hooks already
  in place in a codebase."
- **Why it matters:** same shape as the Skills gap — nothing to point at.
- **To plan:** what hook(s) make sense for this repo's workflow (e.g. a
  pre-commit test run, a guard against editing `REQ-001`–`REQ-046`, a
  reminder to update REQUIREMENTS/USER_STORIES/ACCEPTANCE_CRITERIA on
  relevant file changes).

### 4. No automated PR review, only a test gate

- **Current state:** `.github/workflows/pr-tests.yml` runs `npm test` on
  PRs. Nothing posts review findings automatically — no bot, no
  `/code-review` wired into CI.
- **Course claim:** "automated pull-request review" as a listed capability;
  "respond to automated PR review findings" / "triaging automated review
  findings" as learning outcomes.
- **Why it matters:** without an automated source of findings, this
  outcome can only happen if a facilitator manually triggers a review,
  which contradicts "facilitators unblock environment issues, not direct
  the approach."
- **To plan:** a CI-wired review step (e.g. `/code-review` or equivalent)
  that posts findings on PRs automatically, decide review depth/effort
  level, and confirm it fits inside the branch-protection/required-checks
  setup already in place.

### 5. No log infrastructure

- **Current state:** logging is scattered `console.log` calls
  (`backend/index.js`, `backend/middleware/errorHandler.js`) with no log
  files, aggregation, or query story.
- **Course claim:** "diagnose and resolve a realistic cross-cutting issue
  using application code, database schema, and logs together."
- **Why it matters:** there's no log data to correlate against beyond raw
  stdout in a running process.
- **To plan:** what minimal log story is worth building (structured
  request/error logging, a log file or sink participants can grep/query,
  maybe seeded with realistic entries relevant to the incident/feature
  chosen) — proportionate to a one-day course, not a production logging
  stack.

### 6. `GITHUB.md` is stale on the CI claim

- **Current state:** `GITHUB.md` section "Before opening the PR" says
  "There is currently no CI check that runs this automatically on a PR" —
  written before `pr-tests.yml` was added.
- **Why it matters:** minor, but students will read this as current
  guidance and it contradicts what the PR gate actually does.
- **To plan:** just a doc fix — update or remove that sentence.

### 7. Backlog is all feature requests, no incident scenario

- **Current state:** `ISSUES.md` / GitHub Issues #1–20 are all net-new
  feature tickets.
- **Course claim:** kickoff briefing frames the task as "a realistic
  feature request **or incident**."
- **Why it matters:** the "diagnose via logs" outcome (see gap 5) fits an
  incident/bug scenario much better than a greenfield feature ticket. Not
  a blocker if the course goes the feature route, but worth a deliberate
  choice rather than defaulting to what's already in the backlog.
- **To plan:** decide whether to add one or more incident-style tickets
  (a reproducible bug tied to logs + schema + code) alongside the existing
  feature backlog, or keep the course feature-only and adjust the
  "diagnose via logs" outcome's framing instead.

## Priority for planning

Gaps 1–4 block stated learning outcomes and should be resolved before this
repo is used for the course. Gap 5 blocks one specific outcome (log-based
diagnosis) — resolvable either by building log infrastructure or by
re-scoping that outcome. Gaps 6–7 are cheap fixes, not blockers.

**Gaps 1 (MCP servers) and 2 (Skills) are complete** — see their entries
above, [`PROPOSAL-MCP.md`](./PROPOSAL-MCP.md), [`INIT.md`](./INIT.md),
and `.claude/skills/req-doc/SKILL.md`. Of gaps 1–4 (the ones blocking
stated learning outcomes), gaps 3–4 remain open.
