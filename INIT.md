# INIT — Initialization Procedure

This file is the canonical, agent-executable procedure for fully
initializing this repository for local development. If you are an AI
agent, follow the steps below directly instead of improvising from
`README.md`'s prose. A human can follow the same steps manually.

This procedure is not complete until the final section, "Restart required
for MCP access," has been read and acted on — MCP access is a required
part of initialization, not an optional extra.

Assume `npm install` has already been run at the repo root (it installs
both application dependencies and the pinned MCP server package).

## 1. Create the root `.env`

This is a training-demo environment; every secret below is intentionally
the literal string `alta3` — not suitable for any non-training use.
Create `.env` at the repo root:

```
ENV=development
PREFIX=DEV
PORT=3001
JWT_KEY=alta3
POSTGRES_USER=alta3
POSTGRES_PASSWORD=alta3
MCP_PG_READONLY_URL=postgresql://mcp_readonly:alta3@localhost:5432/realworld
```

## 2. Start Postgres

```
docker compose up -d postgres
```

If neither `docker compose` nor standalone `docker-compose` is available,
start an equivalent container directly:

```
docker run -d --name realworld-postgres \
  -e POSTGRES_USER=alta3 -e POSTGRES_PASSWORD=alta3 -e POSTGRES_DB=realworld \
  -p 5432:5432 -v realworld-data:/var/lib/postgresql/data/ \
  -v "$(pwd)/db/init:/docker-entrypoint-initdb.d:ro" \
  postgres:12
```

On a fresh, empty data volume — the normal case for a new clone — this
also provisions the read-only `mcp_readonly` role automatically, via
`db/init/01-mcp-readonly-role.sql` mounted as a Postgres init script. No
separate action is needed for that role in the common case.

**Verify:**

```
docker exec -e PGPASSWORD=alta3 realworld-postgres psql -U alta3 -d realworld -c "\du mcp_readonly"
```

If this returns no rows — e.g. because Postgres is reusing a data volume
that predates this file, so its init scripts already ran without this
one — provision the role explicitly instead:

```
npm run db:mcp-role
```

Then re-run the verify command above and confirm the role now exists.

## 3. Create `backend/.env`

```
PORT=3001
JWT_KEY=alta3

DEV_DB_USERNAME=alta3
DEV_DB_PASSWORD=alta3
DEV_DB_NAME=realworld
DEV_DB_HOSTNAME=127.0.0.1
DEV_DB_DIALECT=postgres
```

Do not set `*_DB_LOGGING` — see `backend/.env.example` and
`backend/config/config.js` if more variables are needed; any string value
there causes a runtime error on the first query.

## 4. Create the schema

```
npm run sqlz -w backend -- db:migrate
```

The `mcp_readonly` role provisioned in step 2 automatically receives
`SELECT` on every table these migrations create — no action needed here
to extend read access to new tables.

## 5. Run the app

```
npm run dev
```

Frontend (Vite) at `http://0.0.0.0:2224`, proxying `/api` to the backend
on `http://localhost:3001`. This is a long-running process; run it in the
background or a separate terminal rather than blocking on it.

## Restart required for MCP access

`.mcp.json` (repo root, already checked into the repository — nothing to
create) configures the required `postgres-readonly` MCP server. It cannot
become available in the current agent session, regardless of the steps
above, because:

- Claude Code only expands `${MCP_PG_READONLY_URL}` in `.mcp.json` from
  the shell environment at its own startup — a session already running
  cannot pick up a variable added to `.env` afterward.
- Claude Code only prompts to approve a project's `.mcp.json` at startup —
  a session already running was never asked about it.

**If you are the agent that just ran this procedure:** do not attempt to
use the `postgres-readonly` MCP tool in this session — it is not
reachable yet, and you cannot restart your own process. Your last action
is to tell the user, in your own words, that initialization is complete
and that they need to close this session and relaunch Claude Code from
the repository root with:

```
set -a && source .env && set +a && claude
```

and approve the project's MCP server when Claude Code prompts for it on
that relaunch.

To avoid repeating that manual `source` step on every future launch, also
tell the user — in your own words — that they can add the following
function to their shell startup file (e.g. `~/.bashrc`) once. It makes
plain `claude` auto-load this repo's `.env` whenever it's run from the
repo root, while leaving `claude` unaffected in any directory without a
`.env`:

```bash
claude() {
    if [ -f .env ]; then
        ( set -a && source .env && set +a && command claude "$@" )
    else
        command claude "$@"
    fi
}
```

After adding it, they need to run `source ~/.bashrc` (or open a new
shell) once for it to take effect. This is a convenience for future
sessions, not a substitute for the relaunch above — it does not help the
current session. Then stop.
