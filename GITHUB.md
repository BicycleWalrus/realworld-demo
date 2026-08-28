# GitHub Push Access Setup (Personal Access Token — Classic)

Procedure to configure this workstation to push to this repository over HTTPS
using a GitHub Personal Access Token (classic), and to install and use the
GitHub CLI (`gh`) to open Pull Requests.

Repo remote: `https://github.com/BicycleWalrus/realworld-demo.git`

## 1. Create the token on GitHub

1. Sign in to GitHub in a browser.
2. Go to **Settings → Developer settings → Personal access tokens → Tokens (classic)**
   (https://github.com/settings/tokens).
3. Click **Generate new token → Generate new token (classic)**.
4. Fill in:
   - **Note**: something identifiable, e.g. `realworld-demo-workstation`.
   - **Expiration**: pick a value per your org's security policy (avoid "No expiration" if possible).
   - **Scopes**: check `repo` (full control of private/public repos). If this is a public repo and you only need to push, `public_repo` is enough.
5. Click **Generate token** and copy it immediately — GitHub only shows it once.
   Store it in a password manager; treat it like a password.

> You'll reuse this same token in section 2 below when you authenticate `gh`.

## 2. Install and authenticate the GitHub CLI (`gh`)

`gh` is GitHub's official command-line tool. You'll use it in section 5 to
create Pull Requests (and, optionally, to push/pull without ever handling a
raw token yourself).

### Install

Pick whichever matches your OS. Full instructions (all platforms/package
managers): https://github.com/cli/cli#installation.

```bash
# macOS (Homebrew)
brew install gh

# Debian / Ubuntu
sudo apt update
sudo apt install gh
# If `gh` isn't found in your apt repos, follow the official apt-repo setup
# steps at https://github.com/cli/cli/blob/trunk/docs/install_linux.md
# instead of the two lines above.

# Fedora / RHEL / CentOS
sudo dnf install gh

# Windows (winget)
winget install --id GitHub.cli

# Windows (Scoop)
scoop install gh
```

Verify it installed:

```bash
gh --version
```

### Authenticate

```bash
gh auth login
```

Answer the prompts:

- **What account do you want to log into?** → `GitHub.com`
- **What is your preferred protocol for Git operations?** → `HTTPS` (matches
  the remote URL and section 1's setup above)
- **Authenticate Git with your GitHub credentials?** → `Y` — this lets `gh`
  manage git's credential helper for you, so you generally **don't need to
  separately set up `credential.helper store` from section 1**; `gh` handles
  authenticated `git push`/`git pull` too, once logged in this way. (If you'd
  already set up a PAT via section 1 before installing `gh`, that's fine —
  the two won't conflict, `gh`'s credential helper simply takes precedence.)
- **How would you like to authenticate GitHub CLI?**
  - `Login with a web browser` (easiest — opens a browser, you approve, done), or
  - `Paste an authentication token` — paste the PAT you created in section 1.

Verify you're logged in:

```bash
gh auth status
```

You should see `✓ Logged in to github.com account <your-username>`.

## 3. Configure git and push

If you did **not** let `gh auth login` configure git credentials above, set
up git manually instead:

```bash
git config --global credential.helper store
git config --global user.name "YOUR_GITHUB_USERNAME"
git config --global user.email "YOUR_EMAIL@example.com"
git status
git add *
git commit -m "your commit message"
git push origin HEAD
```

- `credential.helper store` saves the token to `~/.git-credentials` (unencrypted)
  after the first prompt, so you won't be asked again on this machine.
- On the first `git push`, you'll be prompted for credentials:
  - **Username**: `YOUR_GITHUB_USERNAME` (or your own account if pushing to a fork).
  - **Password**: paste the **token** from step 1 (NOT your GitHub account password —
    GitHub no longer accepts account passwords over HTTPS).
- Always check `git status` before `git add *` to confirm you're only staging
  the files you intend to commit.

## 4. Create a branch

### Claim your ticket first

Before branching, if you're working from the [`ISSUES.md`](./ISSUES.md)
backlog, claim your issue so two people don't start the same one:

```bash
gh issue edit <number> --add-assignee @me
```

Or, in the web UI, open the issue and click **assign yourself** in the
sidebar. Check `gh issue list --assignee ""` (or just look at the issue
list on GitHub) for anything still unclaimed before you pick one. A few
issues call out overlapping scope with another issue — read the
"Constraints" section of your ticket for any such note before starting.

### Naming convention

Since multiple developers work on this repo, prefix every branch with your
GitHub username (or initials) so branch names never collide, followed by a
short type and description.

```
<username>/<type>-<short-description>
```

- `<username>`: your GitHub username, e.g. `YOUR_GITHUB_USERNAME`.
- `<type>`: `feat`, `fix`, `chore`, `docs`, etc.
- `<short-description>`: a few hyphen-separated words describing the change.

Examples: `YOUR_GITHUB_USERNAME/feat-login-form`,
`YOUR_GITHUB_USERNAME/fix-navbar-overflow`.

**Procedure:**

```bash
git checkout main
git pull origin main
git checkout -b YOUR_GITHUB_USERNAME/feat-short-description
```

Then make your changes and push with:

```bash
git push -u origin YOUR_GITHUB_USERNAME/feat-short-description
```

The `-u` flag links the local branch to the remote one, so future
`git push`/`git pull` on this branch don't need the branch name repeated.

## 5. Create a Pull Request

Once your branch is pushed (section 4), open a PR to merge it into `main`.

`main` is a protected branch: a PR must pass the automated `Run Tests`
check and get at least one approving review before it can be merged —
neither the web UI's merge button nor `gh pr merge` will let it through
otherwise. See "Before opening the PR" below for how to run the same
tests locally first.

Every new PR is pre-filled with the checklist from
[`.github/PULL_REQUEST_TEMPLATE.md`](./.github/PULL_REQUEST_TEMPLATE.md)
(shown automatically in the web UI; with `gh pr create`, it's used
whenever you don't pass `--body`/`--body-file`/`--fill`). Fill it in
rather than deleting it — reviewers use it to check the Definition of
Done from your ticket.

**Option A — GitHub web UI:**

1. Go to the repo: https://github.com/BicycleWalrus/realworld-demo.
2. GitHub usually shows a **"Compare & pull request"** banner for your
   just-pushed branch — click it. Otherwise, go to the **Pull requests** tab
   and click **New pull request**, then set base: `main` and compare:
   your branch.
3. Fill in a clear title and a description of what changed and why.
4. Click **Create pull request**.

**Option B — GitHub CLI (`gh`), recommended:**

```bash
gh pr create --base main --title "Short summary of the change" --body "What changed and why."
```

- If `gh` isn't installed/authenticated yet, do section 2 first.
- Instead of `--body "..."` inline, you can write a longer description in a
  file and pass `--body-file path/to/description.md`.
- Add `--draft` if the PR isn't ready for review yet.
- Omit `--title`/`--body` and add `--fill` to auto-populate them from your
  branch's commit(s): `gh pr create --base main --fill`.
- Running `gh pr create` with no flags at all starts an interactive prompt
  that walks you through title, body, reviewers, etc.

### If your PR closes one of the backlog issues (`ISSUES.md`)

Find your ticket's issue number first:

```bash
gh issue list                 # list all open issues
gh issue view 12               # read one issue's full body
gh issue view 12 --web         # open it in the browser instead
```

Prefix the PR **title** with `Issue-<number>: ` so it's identifiable at a
glance in the PR list, and include a closing keyword referencing that
number in the PR's **body** — GitHub will automatically close the issue
when the PR merges into `main`:

```bash
gh pr create --base main \
  --title "Issue-1: Add dark mode toggle" \
  --body "Implements #1.

- Adds a light/dark theme toggle in the navbar
- Persists the choice in localStorage, defaults to prefers-color-scheme
- Updates REQUIREMENTS.md/USER_STORIES.md/ACCEPTANCE_CRITERIA.md

Closes #1"
```

Any of `close`, `closes`, `closed`, `fix`, `fixes`, `fixed`, `resolve`,
`resolves`, `resolved` followed by `#<number>` works in the body.

### Before opening the PR

Run the test suite locally and make sure it passes:

```bash
npm test
```

(This runs `vitest` across the backend and frontend workspaces — see the
root `package.json`. There is currently no CI check that runs this
automatically on a PR, so it's on you to run it yourself before asking for
review.)

### After opening the PR

- Request a review from at least one other developer.
- Address review comments by pushing more commits to the same branch —
  they'll appear on the PR automatically.
- Once approved, merge via the GitHub UI (or `gh pr merge`), then delete the
  branch (GitHub offers a **Delete branch** button after merge).

### `gh pr` quick reference

| Command | What it does |
|---|---|
| `gh pr create --base main --title "..." --body "..."` | Open a PR from the current branch |
| `gh pr status` | Show PRs relevant to you (yours, review-requested, etc.) |
| `gh pr list` | List open PRs on the repo |
| `gh pr view` | Show details of the PR for the current branch (`--web` to open in browser) |
| `gh pr checkout <number>` | Check out someone else's PR branch locally, to review or test it |
| `gh pr diff` | Show the diff for the current branch's PR |
| `gh pr comment --body "..."` | Comment on the current branch's PR |
| `gh pr review --approve` | Approve the current branch's PR |
| `gh pr review --request-changes --body "..."` | Request changes on the current branch's PR |
| `gh pr merge` | Merge the current branch's PR (prompts for merge method) |
| `gh pr close` | Close a PR without merging |

## 6. Instructions for AI Agents

If you are an AI coding agent (e.g. Claude Code) working in this repo,
follow this procedure to open a Pull Request. Only push and open a PR when
the user has explicitly asked for it — do not do so proactively.

1. **Never commit directly to `main`.** Confirm the current branch with
   `git branch --show-current`; if it is `main`, create a new branch first:

   ```bash
   git checkout main
   git pull origin main
   git checkout -b <username>/<type>-<short-description>
   ```

   Use the naming convention from section 4. If you don't know the user's
   GitHub username, ask, or reuse the current `git config user.name`.

2. **Review staged/unstaged changes before committing.** Run `git status`
   and `git diff`. Stage only the files relevant to the task — never
   `git add *`/`git add -A` blindly, and never stage files that look like
   secrets (`.env`, credentials, tokens).

3. **Commit with a message describing why, not just what**, e.g.:

   ```bash
   git commit -m "Short summary of the change and its motivation"
   ```

4. **Push the branch:**

   ```bash
   git push -u origin <username>/<type>-<short-description>
   ```

5. **Open the PR with `gh`:**

   ```bash
   gh pr create --base main --title "<title>" --body "<summary + test plan>"
   ```

   The `--body` should summarize the change as bullet points and include a
   test plan, per section 5. If the work closes one of the tracked backlog
   issues (`ISSUES.md`), prefix the `--title` with `Issue-<number>: ` and
   include `Closes #<number>` in the body, per the "If your PR closes one
   of the backlog issues" guidance above — check with the user for the
   issue number if it isn't already clear from the task. Do not use
   `--draft` unless asked.

6. **Report the PR URL back to the user.** Do not merge the PR, delete
   branches, or force-push unless the user explicitly asks — those are
   destructive/shared-state actions that require confirmation first.

## Notes

- Classic tokens are being phased in favor of fine-grained PATs by GitHub,
  but classic tokens remain fully supported for git-over-HTTPS auth.
- If the token expires, repeat step 1 and re-authenticate on the next push —
  easiest is to delete/edit `~/.git-credentials` and push again to be re-prompted.
  If you're authenticating via `gh` instead, run `gh auth login` again.
- Rotate/revoke tokens from https://github.com/settings/tokens when no longer needed.
- If you'd rather not persist the token on disk, use `git config --global
  credential.helper cache` (expires after a timeout, default 15 minutes)
  instead of `store`. `gh auth login` avoids this whole question, since it
  never writes a raw token to `~/.git-credentials` in the first place.
- To fully log out `gh` on a shared/temporary machine: `gh auth logout`.
