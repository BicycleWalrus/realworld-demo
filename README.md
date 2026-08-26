# Conduit — Legacy Implementation

> **For AI agents:** to initialize this application — database, schema,
> and the required MCP server — do not improvise from the setup steps
> below. Read and follow [`INIT.md`](./INIT.md) instead; it is the
> canonical, agent-executable initialization procedure for this
> repository.

## Purpose

This repository contains a working full-stack implementation of **Conduit**, a
social blogging platform in the style of Medium, built to the
[RealWorld](https://github.com/gothinkster/realworld) specification. Users can
register an account, publish and edit articles written in Markdown, tag
articles, comment on articles, favorite articles, and follow other authors. A
personalized feed shows articles from authors a user follows, alongside a
global feed of all articles.

The system is composed of:

- A REST API (Node.js / Express / Sequelize) that persists data in a
  relational database and enforces authentication and ownership rules.
- A single-page web client (React) that consumes the API to provide the
  browsing, authoring, and social-interaction experience.

## Primary domain concepts

- **User** — an account with credentials (email/password), a public profile
  (username, bio, image), and a session token issued at login.
- **Article** — a piece of content with a title, description, and Markdown
  body, written by exactly one User (its author), and identified externally
  by a slug derived from its title.
- **Comment** — a piece of text written by a User in reply to a specific
  Article.
- **Tag** — a short label that can be attached to an Article; Articles can be
  browsed or filtered by tag.
- **Favorite** — a relationship between a User and an Article expressing that
  the User has marked the Article as a favorite; Articles carry a favorite
  count and a per-viewer favorited state.
- **Follow** — a relationship between two Users (follower and followed);
  following another user causes that user's articles to appear in the
  follower's personalized feed.

## Status of this codebase

This is an **existing legacy implementation**. The application is functional
and already in use; this documentation set (`README.md`,
[`REQUIREMENTS.md`](./REQUIREMENTS.md), [`USER_STORIES.md`](./USER_STORIES.md),
and [`ACCEPTANCE_CRITERIA.md`](./ACCEPTANCE_CRITERIA.md)) describes the
system **as it currently behaves**, reconstructed directly from its source
code and existing automated tests. It intentionally does not propose
architectural changes, refactors, or new features — including any behavior
that is arguably a defect. Where the current implementation contains a
surprising, inconsistent, or fragile behavior, that behavior is documented
as-is in `REQUIREMENTS.md`, because it is what the running system actually
does today.

## Local development setup — Postgres

The backend requires a Postgres database and reads its connection details
from environment variables (via `dotenv`). Neither `backend/.env` nor a
root `.env` is checked into the repository; both must be created locally.
This is a training-demo environment, so all secrets below are the literal
string `alta3` — not suitable for any non-training use.

### 1. Start a Postgres container

`docker-compose.yml` defines a `postgres:12` service, published to the host
on port `5432`, driven by a root `.env`:

```
# .env  (repo root)
ENV=development
PREFIX=DEV
PORT=3001
JWT_KEY=alta3
POSTGRES_USER=alta3
POSTGRES_PASSWORD=alta3
```

Then bring the database service up:

```
docker compose up -d postgres
```

If the `docker compose` (or standalone `docker-compose`) CLI isn't
available, start an equivalent container directly instead:

```
docker run -d --name realworld-postgres \
  -e POSTGRES_USER=alta3 -e POSTGRES_PASSWORD=alta3 -e POSTGRES_DB=realworld \
  -p 5432:5432 -v realworld-data:/var/lib/postgresql/data/ \
  postgres:12
```

### 2. Configure the backend

Create `backend/.env`:

```
PORT=3001
JWT_KEY=alta3

DEV_DB_USERNAME=alta3
DEV_DB_PASSWORD=alta3
DEV_DB_NAME=realworld
DEV_DB_HOSTNAME=127.0.0.1
DEV_DB_DIALECT=postgres
```

`backend/config/config.js` also defines `test` and `production` blocks
(`TEST_DB_*`, `PROD_DB_*`) following the same pattern — see
`backend/.env.example` for the full variable list.

Do not set `*_DB_LOGGING`: `config/config.js` passes it straight through
to Sequelize's `logging` option, and Sequelize only accepts `false` or a
function there — any string value (which is all an env var can be) causes
a runtime error the first time a query runs.

### 3. Create the schema

```
npm run sqlz -w backend -- db:migrate
```

### 4. Run the app

```
npm run dev
```

This runs the frontend and backend dev servers concurrently: the frontend
(Vite) is reachable at `http://0.0.0.0:2224`, and it proxies `/api`
requests to the backend on `http://localhost:3001`.

`npm start` (root) is a different, production-style path — it builds the
frontend to static files and runs only the backend, which serves those
files itself (only when `NODE_ENV=production` is set) on port `3001`.
There is no `2224` server in that path; use `npm run dev` for local
development.

### 5. Read-only MCP access for diagnostics

`.mcp.json` (repo root) configures a read-only Postgres MCP server for
Claude Code. On a fresh `docker compose up -d postgres`, the
`mcp_readonly` role provisions itself automatically. If you're reusing an
existing Postgres volume, run once instead:

```
npm run db:mcp-role
```

Add this line to your root `.env` (see step 1):

```
MCP_PG_READONLY_URL=postgresql://mcp_readonly:alta3@localhost:5432/realworld
```

Claude Code reads `${MCP_PG_READONLY_URL}` from your shell's environment,
not from `.env` directly — export it before launching Claude Code:

```
set -a && source .env && set +a && claude
```

The role can only `SELECT`; any write attempt through the MCP tool is
rejected by Postgres itself, not just by the tool.

## Claude Code tooling in this repo

This repo is configured with several pieces of Claude Code tooling. Item 5
of the Postgres setup above covers the MCP server; the rest are covered
here.

### Subagents (`.claude/agents/`)

- **`code-reviewer`** — read-only focused code review of a specific file,
  feature, or change (not full-codebase audits, not test runs, not edits).
- **`test-runner`** — runs `npm test` and reports pass/fail results only;
  does not diagnose failures, suggest fixes, or modify anything.

### Skills (`.claude/skills/`)

- **`req-doc`** — drafts the matching `REQUIREMENTS.md`/`USER_STORIES.md`/
  `ACCEPTANCE_CRITERIA.md` entries (next unused `REQ-###`/`US-###`/`AC-###`
  numbers, cross-referenced, plus the Traceability Matrix row) for a
  behavior change just made or described, in this repo's exact existing
  style. Applies the edits directly and stops for review — never stages,
  commits, or pushes. This is the task `ISSUES.md`'s Definition of Done
  (item 3) requires for every ticket.

### Hooks (`.claude/settings.json`, `.claude/hooks/`)

- A `PreToolUse` hook (matcher `Edit|Write|MultiEdit`) runs
  `.claude/hooks/req-freeze-guard.cjs`, which mechanically blocks edits to
  any *existing* `REQ-###`/`US-###`/`AC-###` entry or Traceability Matrix
  row in `REQUIREMENTS.md`/`USER_STORIES.md`/`ACCEPTANCE_CRITERIA.md` —
  only new, higher-numbered entries may be added. This holds even under
  bypassed permissions. It does not guard edits made via `Bash` (e.g.
  `sed -i`) rather than Claude Code's own Edit/Write/MultiEdit tools — PR
  review is the backstop there.

### Automated PR checks (`.github/workflows/`)

- **`pr-tests.yml`** — runs `npm test` on every PR into `main`; a required,
  blocking check (branch protection won't allow merging without it
  passing).
- **`codeql.yml`** — GitHub CodeQL security scanning (`javascript-typescript`,
  `security-and-quality` query pack) on every PR into `main`, on pushes to
  `main`, and weekly. Findings surface as annotations on the PR's "Files
  changed" tab and as alerts in the repo's Security tab. Because this repo
  is public, this runs under GitHub Advanced Security's free-for-public-repos
  tier — no API key, no per-run token cost. It is advisory, not a required
  check, and only flags security-pattern issues (e.g. injection, SSRF,
  hardcoded secrets) — not general code-quality findings.

## Related documents

| Document | Contents |
|---|---|
| [`INIT.md`](./INIT.md) | Canonical, agent-executable initialization procedure (database, schema, required MCP server). |
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | Numbered (`REQ-###`) statements of observable system behavior. |
| [`USER_STORIES.md`](./USER_STORIES.md) | Numbered (`US-###`) stories tracing back to one or more requirements. |
| [`ACCEPTANCE_CRITERIA.md`](./ACCEPTANCE_CRITERIA.md) | Numbered (`AC-###`) testable criteria tracing back to one or more user stories. |
| [`ISSUES.md`](./ISSUES.md) | Backlog of new-feature tickets (also filed as GitHub Issues) for the course assignment, with acceptance criteria and Definition of Done. |
| [`GITHUB.md`](./GITHUB.md) | How to get push access, install/use `gh`, and open a Pull Request against this repo. |
