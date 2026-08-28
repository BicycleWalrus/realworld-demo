---
name: run-app
description: Launch this repo's Postgres container, backend, and frontend dev servers, then drive the running app with a Playwright script (register/login, click through pages, screenshot) to visually verify a frontend change. Use whenever a ticket touches frontend UI/CSS and needs human or automated visual confirmation before opening a PR.
---

This repo has no existing seed data or fixtures, and `playwright` is not a
project dependency — every frontend-visual ticket in the `ISSUES.md`
backlog will otherwise redo this setup from scratch. This skill captures
the exact commands and the two gotchas that cost real time the first time
through (Issue 1, dark mode toggle).

## 1. Start Postgres

Check whether it's already running before starting a duplicate:

```bash
docker ps --filter "name=realworld-demo-postgres" --format "{{.Names}}: {{.Status}}"
```

If nothing is listed, start it via the `postgres` service in
`docker-compose.yml`:

```bash
docker compose up -d postgres
```

## 2. Start backend + frontend dev servers

Free the ports first if a previous run is still bound (npm doesn't forward
signals to the process it spawns, so killing the port's listener is what
actually frees it):

```bash
lsof -ti:2224 -sTCP:LISTEN | xargs -r kill   # frontend (Vite)
lsof -ti:3001 -sTCP:LISTEN | xargs -r kill   # backend (Express)
```

Then start both, backgrounded, and poll rather than sleeping a fixed time.
**Gotcha:** `timeout` is a GNU coreutils command and is not installed by
default on macOS/BSD — `timeout 30 ...` fails with `command not found`
there. Use a manual retry loop instead, which works on both:

```bash
(npm run dev -w backend > /tmp/backend-dev.log 2>&1 &)
(npm run dev -w frontend > /tmp/frontend-dev.log 2>&1 &)
for i in $(seq 1 30); do curl -sf http://localhost:3001/api/articles >/dev/null && break; sleep 1; done
for i in $(seq 1 30); do curl -sf http://localhost:2224/ >/dev/null && break; sleep 1; done
```

Check `/tmp/backend-dev.log` if the backend curl never succeeds — the most
likely cause is Postgres not actually up yet (step 1).

## 3. Set up Playwright (one-time per session)

`playwright` isn't a project devDependency, so `npx` fetches it fresh each
session:

```bash
npx playwright install chromium --with-deps
```

**Gotcha:** Node resolves `import { chromium } from "playwright"` relative
to the *script file's own directory*, not your shell's cwd. Since the
`playwright` package only exists inside npx's cache (not this repo's
`node_modules`), a driver script placed anywhere in the repo or `/tmp`
will fail with `ERR_MODULE_NOT_FOUND`. Find the npx cache dir and write
the driver script there instead:

```bash
find ~/.npm/_npx -maxdepth 4 -iname playwright   # prints .../<hash>/node_modules/playwright
```

Write your `.mjs` driver script into that same `<hash>` directory (a
sibling of its `node_modules`), then run it with `node <hash-dir>/script.mjs`
from any cwd.

If this pattern gets used often enough that the dance becomes annoying,
consider proposing `npm i -D playwright` as a one-time repo change instead
— that would let scripts live anywhere and skip this gotcha entirely, but
is a real dependency addition, not something this skill should do
unprompted.

## 4. Drive the app

There's no seed user or fixture data. Register one through the UI inside
the Playwright script — use a timestamp-suffixed username so reruns don't
collide with a leftover account:

```js
import { chromium } from "playwright";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });

await page.goto("http://localhost:2224/#/register", { waitUntil: "networkidle" });
const uname = "verifyuser" + Date.now();
await page.fill('input[placeholder="Your Name"]', uname);
await page.fill('input[placeholder="Email"]', uname + "@example.com");
await page.fill('input[placeholder="Password"]', "password123");
await page.click('button:has-text("Sign up")');
await page.waitForTimeout(1000);

// ... navigate, click, screenshot as needed for the change under test ...
await page.screenshot({ path: "/tmp/verify.png" });

await browser.close();
```

Screenshots land wherever you point `path` — `Read` them directly to look
at the result. Use the app's real routes (`#/login`, `#/settings`,
`#/editor`, `#/profile/<username>`, `#/article/<slug>`) and real form
`placeholder`s/button text as selectors, matching what's in
`frontend/src/components`/`frontend/src/routes` — this app has no
`data-testid` attributes.

## 5. Tear down

```bash
lsof -ti:2224 -sTCP:LISTEN | xargs -r kill
lsof -ti:3001 -sTCP:LISTEN | xargs -r kill
```

Leave the Postgres container running unless the user asks otherwise — it
was likely already running before this skill started, and other sessions
may depend on it.
