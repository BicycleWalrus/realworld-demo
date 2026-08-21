# GitHub Push Access Setup (Personal Access Token — Classic)

Procedure to configure this workstation to push to this repository over HTTPS
using a GitHub Personal Access Token (classic).

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

## 2. Configure git and push

From the repo directory, run:

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

## 3. Create a branch

Since multiple developers work on this repo, prefix every branch with your
GitHub username (or initials) so branch names never collide, followed by a
short type and description.

**Naming convention:**

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

## 4. Create a Pull Request

Once your branch is pushed (step 3), open a PR to merge it into `main`.

**Option A — GitHub web UI:**

1. Go to the repo: https://github.com/BicycleWalrus/realworld-demo.
2. GitHub usually shows a **"Compare & pull request"** banner for your
   just-pushed branch — click it. Otherwise, go to the **Pull requests** tab
   and click **New pull request**, then set base: `main` and compare:
   your branch.
3. Fill in a clear title and a description of what changed and why.
4. Click **Create pull request**.

**Option B — GitHub CLI (`gh`):**

```bash
gh pr create --base main --title "Short summary of the change" --body "What changed and why."
```

- If `gh` isn't installed/authenticated, run `gh auth login` first.
- Add `--draft` if the PR isn't ready for review yet.

**After opening the PR:**

- Request a review from at least one other developer.
- Address review comments by pushing more commits to the same branch —
  they'll appear on the PR automatically.
- Once approved, merge via the GitHub UI (or `gh pr merge`), then delete the
  branch (GitHub offers a **Delete branch** button after merge).

## 5. Instructions for AI Agents

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

   Use the naming convention from section 3. If you don't know the user's
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
   test plan, per section 4. Do not use `--draft` unless asked.

6. **Report the PR URL back to the user.** Do not merge the PR, delete
   branches, or force-push unless the user explicitly asks — those are
   destructive/shared-state actions that require confirmation first.

## Notes

- Classic tokens are being phased in favor of fine-grained PATs by GitHub,
  but classic tokens remain fully supported for git-over-HTTPS auth.
- If the token expires, repeat step 1 and re-authenticate on the next push —
  easiest is to delete/edit `~/.git-credentials` and push again to be re-prompted.
- Rotate/revoke tokens from https://github.com/settings/tokens when no longer needed.
- If you'd rather not persist the token on disk, use `git config --global
  credential.helper cache` (expires after a timeout, default 15 minutes)
  instead of `store`.
