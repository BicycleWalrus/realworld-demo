# Proposal: MCP Server for the Advanced Course

Addresses [`GAPS.md`](./GAPS.md) gap 1. Scope is deliberately minimal: one
server, one purpose, off-the-shelf rather than custom-built. The goal is to
satisfy the course's MCP learning outcome without making MCP a centerpiece
of the day or expanding the repo's attack surface more than necessary.

**Status: feasibility verified live**, against the repo's actual local
`realworld-postgres` container, not just researched. See "Feasibility
verification" below for exactly what was run and what came back.

**Implemented.** Tracked as REQ-047/REQ-048 in
[`REQUIREMENTS.md`](./REQUIREMENTS.md), US-028 in
[`USER_STORIES.md`](./USER_STORIES.md), and AC-076–AC-079 in
[`ACCEPTANCE_CRITERIA.md`](./ACCEPTANCE_CRITERIA.md) — all "pending"
markers removed per this repo's established convention (see REQ-046's
history) after the steps below landed and were verified end-to-end
against the actual committed config (`db/init/01-mcp-readonly-role.sql`,
`docker-compose.yml`'s init-script mount, the pinned dependency, and
`.mcp.json`).

## Decision: one read-only Postgres MCP server, nothing else

Give participants MCP access to the existing local `postgres` service from
`docker-compose.yml` — the same disposable, seeded, non-production database
already used for local dev. Nothing else gets an MCP server (no GitHub MCP,
no filesystem MCP, no log MCP) — `gh` CLI and normal file tools already
cover issue context and source, so a second server would add risk for no
new capability.

This directly covers the stated outcome: "Use MCP tools under limited,
read-mostly credentials without exposing production systems" — there is no
production database in this course's setup for it to reach, and the role it
connects as can't write.

## Why this specific shape

- **Off-the-shelf, not custom-built.** Use a maintained, widely-used
  read-only Postgres MCP server rather than writing one. Less bespoke code
  in this repo means less custom surface to audit or maintain. (Pin an
  exact package/version during implementation and read its source before
  adopting it — don't take "read-only" on faith from its README.)
- **A dedicated read-only DB role, not the app's role.** Create a new
  Postgres role (e.g. `mcp_readonly`) with `GRANT SELECT` only, on the
  `realworld` database only — no `INSERT`/`UPDATE`/`DELETE`/DDL, no
  superuser, no access to other databases or roles. Even if the MCP
  server's own read-only claim were wrong, the DB-level grant is the real
  backstop.
- **No new network exposure.** The MCP server runs as a local subprocess
  (stdio transport) that Claude Code launches per session and talks to
  `localhost:5432`, which is already listening per the existing
  `docker-compose.yml`. This adds no new open port and no new
  externally-reachable service.
- **Credentials stay local and out of git.** The `mcp_readonly` connection
  string goes in `.env` (already gitignored), referenced from a checked-in
  `.mcp.json` by env var name only — never a literal credential committed
  to the repo.
- **No standing auto-approval.** Don't pre-allowlist the MCP server's tools
  in `.claude/settings.json`. Leave it on Claude Code's normal per-session
  permission prompt, so a human approves the first use rather than the
  server acting silently.
- **Not wired into anything else.** No hook or Skill depends on this
  server existing — it's a tool participants reach for during diagnosis,
  not a dependency of any other automated workflow. If it's removed
  later, nothing else breaks.

## What this gets participants

Query the schema and seeded data directly while diagnosing a ticket
(e.g. inspect `Articles`/`Favorites`/`Comments` shape and row-level state)
instead of only reading migration files. That's the entire job of this
server — it does not replace `psql`, migrations, or the Sequelize models as
the source of truth on schema.

## Feasibility verification

Tested directly in this workstation's environment against the repo's real
`docker-compose.yml` `postgres` service (image `postgres:12`, container
`realworld-postgres`), seeded with the app's normal dev data.

**1. DB-level backstop, tested independently of any MCP server:**

```sql
CREATE ROLE mcp_readonly LOGIN PASSWORD '...';
GRANT CONNECT ON DATABASE realworld TO mcp_readonly;
GRANT USAGE ON SCHEMA public TO mcp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mcp_readonly;
ALTER ROLE mcp_readonly SET default_transaction_read_only = on;
```

Connected as `mcp_readonly` via plain `psql` and confirmed:
- `SELECT count(*) FROM "Articles"` → succeeds.
- `DELETE FROM "Users"` → `ERROR: cannot execute DELETE in a read-only
  transaction`.

This backstop holds regardless of which MCP server package sits in front
of it, and regardless of whether that package's own "read-only" claim is
trustworthy.

**2. Package chosen: `@ahmetkca/mcp-server-postgres`, pinned at `1.2.0`.**

Ran it for real: `npx -y @ahmetkca/mcp-server-postgres "postgresql://mcp_readonly:...@localhost:5432/realworld"`,
spoke raw MCP JSON-RPC to it over stdio (`initialize` → `tools/list` →
`tools/call`). Results:
- Starts with no config beyond the connection string — no build step, no
  extra runtime (pure Node, matching this repo's existing stack).
- Exposes exactly **3 tools**: `query` (arbitrary read SQL), `list-schemas`,
  `describe-schema`. Nothing else — no mutation tool, no schema-management
  tool.
- Its `query` tool wraps every call in `BEGIN TRANSACTION READ ONLY` before
  running the SQL (confirmed by reading the published package's source,
  `dist/index.js` — 950 lines, unminified, no `eval`/`child_process`/
  network-exfil calls, just `pg` + the official MCP SDK + `zod`).
- Live `tools/call query` against `"SELECT count(*) FROM \"Articles\""`
  returned real row data. Live `tools/call query` against
  `"DELETE FROM \"Users\""` was rejected — blocked at **both** layers (the
  package's own read-only transaction, and the `mcp_readonly` role's
  grants).
- `list-schemas` correctly reported the `public` schema with its 8 tables.

**Caveat on this package, stated plainly:** its `package.json` points at a
GitHub repo (`ahmetkca/mcp-server-postgres`) that now 404s — no live
upstream to track for patches or verify authorship against. Downloads are
modest (~544/month) and it hasn't published since August 2025. This is why
the proposal below pins the exact version by lockfile integrity hash
rather than trusting `npx -y <pkg>` to silently resolve "latest" at some
future session — a compromised or malicious future release can't reach
students who are locked to the audited `1.2.0` tarball.

**3. Rejected during testing: `@henkey/postgres-mcp-server`.** Marketed as
a Postgres MCP server; probing it live showed **17 tools**, including
`pg_execute_mutation`, `pg_manage_users`, `pg_manage_rls`,
`pg_manage_triggers`, `pg_manage_functions`, and `pg_copy_between_databases`
— a full DBA-admin surface, not a narrow read tool. The `mcp_readonly`
role's grants would still block writes from it, but the tool surface itself
is the wrong shape for "not a primary focus," so it's out regardless of
the DB backstop. Recording this here so it isn't picked again later without
this context.

**4. Also ruled out: the official `@modelcontextprotocol/server-postgres`.**
Deprecated and archived by its Anthropic maintainers; publicly documented
as having shipped a bypass of its own read-only enforcement via transaction
control statements (`COMMIT; DROP TABLE ...`). Confirms the proposal's core
design choice: never trust a server's self-reported read-only mode as the
only enforcement layer — the DB role grant has to be the real one.

## Implementation plan (final)

Ordered so that the **default path for a brand-new checkout costs zero
extra manual steps** — the role provisions itself the same moment the
Postgres container does. Everything below is additive to the existing
`docker compose up -d postgres` / `npm install` / `npm run dev` flow in
`README.md`'s "Local development setup." MCP access is a required part of
that setup, not an optional add-on — see [`INIT.md`](./INIT.md), the
canonical agent-executable initialization procedure.

### 1. `db/init/01-mcp-readonly-role.sql` (new file)

```sql
-- Provisions a read-only role for the MCP diagnostic server (REQ-047).
-- Idempotent: safe to re-run against a database that already has data,
-- not only against a fresh volume.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'mcp_readonly') THEN
    CREATE ROLE mcp_readonly LOGIN PASSWORD 'alta3';
  END IF;
END
$$;

GRANT CONNECT ON DATABASE realworld TO mcp_readonly;
GRANT USAGE ON SCHEMA public TO mcp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO mcp_readonly;
ALTER ROLE mcp_readonly SET default_transaction_read_only = on;
```

Password is the literal string `alta3`, matching every other credential
already in this training repo (`README.md`'s Postgres setup section is
explicit that all secrets here are `alta3` and "not suitable for any
non-training use") — no bespoke secret to invent or leak.

This exact SQL is verified: it's what was run live against
`realworld-postgres` during feasibility testing (see above), byte-for-byte
except the password placeholder.

### 2. `docker-compose.yml` — one line added to the `postgres` service

```diff
   postgres:
     image: postgres:12
     ...
     volumes:
       - realworld-data:/var/lib/postgresql/data/
+      - ./db/init:/docker-entrypoint-initdb.d:ro
```

The official `postgres` image runs every `.sql`/`.sh` file in
`/docker-entrypoint-initdb.d` **automatically, in filename order, but only
the first time the data directory is empty**. For anyone doing a fresh
`docker compose up -d postgres` — every new course machine, every fresh
clone — `mcp_readonly` exists with no action from the student. This is the
"quickly and easily right from the start" path.

It will **not** re-run against this workstation's existing
`realworld-data` volume (already initialized, already has the role from
manual verification) or any other pre-existing volume — see step 3 for
that case.

### 3. `package.json` (root) — pinned dependency + fallback script

```diff
   "scripts": {
     "dev": "concurrently --names 'Node,Vite' -c 'green,blue' 'npm run dev -w backend' 'npm run dev -w frontend'",
     "sqlz": "npx -w backend sequelize-cli",
     "start": "npm run build -w frontend && npm run start -w backend",
-    "test": "vitest"
+    "test": "vitest",
+    "db:mcp-role": "docker exec -i realworld-postgres psql -U alta3 -d realworld -v ON_ERROR_STOP=1 < db/init/01-mcp-readonly-role.sql"
   },
   "devDependencies": {
     "@vitejs/plugin-react-swc": "^3.2.0",
     "concurrently": "^7.6.0",
     "jsdom": "^30.0.1",
-    "vitest": "^0.29.7"
+    "vitest": "^0.29.7",
+    "@ahmetkca/mcp-server-postgres": "1.2.0"
   }
```

- The version is pinned exactly (`"1.2.0"`, no `^`) — combined with
  `package-lock.json`'s recorded integrity hash, `npm ci`/`npm install`
  verifies the tarball hasn't changed, so a future malicious release of
  this single-maintainer package can't reach students who haven't
  deliberately re-vetted and bumped it.
- `npm install` (already required before `npm run dev` works at all) puts
  the pinned server's binary at `node_modules/.bin/mcp-server-postgres` —
  no separate install step for the MCP piece.
- `npm run db:mcp-role` is the one-command fallback for a database that
  already existed before step 2's init-script mount took effect (this
  workstation, or anyone reusing an older volume) — same idempotent SQL,
  applied by hand once.

### 4. `.mcp.json` (new file, repo root, checked in — no secrets in it)

```json
{
  "mcpServers": {
    "postgres-readonly": {
      "command": "node_modules/.bin/mcp-server-postgres",
      "args": ["${MCP_PG_READONLY_URL}"]
    }
  }
}
```

Claude Code expands `${VAR}` in `args` from the shell's exported
environment at startup (CLI behavior; the desktop app has an open bug
where this expansion doesn't happen, which doesn't matter here since the
course targets Claude Code CLI). It does **not** read `.env` on its own.

### 5. Root `.env` — one line added to the block students already create

`README.md` step 1 already has students hand-create a root `.env` (it's
gitignored, never committed). Add one line to that same block:

```
MCP_PG_READONLY_URL=postgresql://mcp_readonly:alta3@localhost:5432/realworld
```

No new file, no new secret-management story — it's the same `.env` they
were already creating, with one more line.

### 6. `README.md` — new step 5 in the existing numbered walkthrough

Insert after the current step 4 ("Run the app"), matching that section's
existing terse, command-first style:

```markdown
### 5. Read-only MCP access for diagnostics

`.mcp.json` (repo root) configures a read-only Postgres MCP server for
Claude Code. On a fresh `docker compose up -d postgres`, the
`mcp_readonly` role provisions itself automatically. If you're reusing an
existing Postgres volume, run once instead:

    npm run db:mcp-role

Add this line to your root `.env` (see step 1):

    MCP_PG_READONLY_URL=postgresql://mcp_readonly:alta3@localhost:5432/realworld

Claude Code reads `${MCP_PG_READONLY_URL}` from your shell's environment,
not from `.env` directly — export it before launching Claude Code:

    set -a && source .env && set +a && claude

The role can only `SELECT`; any write attempt through the MCP tool is
rejected by Postgres itself, not just by the tool.
```

### 7. Verify, then flip the "pending" status

Only after the above is committed and actually exercised:

1. **Fresh-volume path:** `docker compose down -v && docker compose up -d
   postgres`, then `docker exec -i realworld-postgres psql -U alta3 -d
   realworld -c "\du mcp_readonly"` — role should already exist, no manual
   step taken.
2. **Fallback path:** against a volume that predates step 2, run `npm run
   db:mcp-role`, then the same `\du` check.
3. `npm install`, confirm `node_modules/.bin/mcp-server-postgres` exists.
4. `set -a && source .env && set +a && claude` — confirm the *first*
   reference to the `postgres-readonly` MCP tool in a session triggers
   Claude Code's normal permission prompt (i.e. nothing was
   auto-allowlisted). Approve it, run a read query, confirm real data
   comes back. Attempt a write through the same tool, confirm it's
   rejected.
5. `git status` — only `db/init/01-mcp-readonly-role.sql`,
   `docker-compose.yml`, `package.json`, `package-lock.json`, `.mcp.json`,
   and `README.md` should be new/changed. `.env` stays untracked.
6. Update `REQUIREMENTS.md` (REQ-047, REQ-048), `USER_STORIES.md`
   (US-028), and `ACCEPTANCE_CRITERIA.md` (AC-076–AC-079,
   traceability matrix) to remove every "pending" / "Status: approved,
   not yet implemented" marker — mirroring exactly how commit `4e60da7`
   closed out REQ-046 once its code landed.
7. Open a PR per `GITHUB.md` (branch, commit, `gh pr create`), referencing
   this proposal and the closed-out requirement numbers in the PR body.
