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

## 2. Set your git identity (if not already set)

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

Check current values with `git config --global --get user.name` /
`--get user.email`. (Not currently set on this machine.)

## 3. Configure a credential helper so Git remembers the token

Pick one:

**Option A — cache in memory (simplest, expires after a timeout):**
```bash
git config --global credential.helper cache
# optional: extend the default 15-minute cache
git config --global credential.helper 'cache --timeout=28800'
```

**Option B — store on disk (persists across reboots, unencrypted file `~/.git-credentials`):**
```bash
git config --global credential.helper store
```

Use Option B for a personal workstation if you don't want to re-enter the
token every session. Use Option A if you're on a shared machine.

## 4. Authenticate — first push/pull will prompt for credentials

From the repo directory:

```bash
cd /home/student/realworld-demo
git fetch origin
```

When prompted:
- **Username**: your GitHub username (e.g. `BicycleWalrus`, or your own account if you're pushing to a fork).
- **Password**: paste the **token** you generated in step 1 (NOT your GitHub account password — GitHub no longer accepts account passwords over HTTPS).

With `credential.helper store`, this is only needed once — the token is then
saved to `~/.git-credentials` and reused automatically.

## 5. Verify push access

```bash
git checkout -b test-push-access
git commit --allow-empty -m "test: verify push access"
git push -u origin test-push-access
```

If the push succeeds, delete the test branch locally and remotely:

```bash
git push origin --delete test-push-access
git branch -D test-push-access
```

## 6. (Optional) Store the token as an environment variable instead

If you prefer not to use a credential helper (e.g. for scripting), you can
embed the token in the remote URL for this repo only:

```bash
git remote set-url origin https://<TOKEN>@github.com/BicycleWalrus/realworld-demo.git
```

Caution: this writes the token in plaintext into `.git/config`. Prefer the
credential helper approach (steps 3–4) unless you have a specific reason to
do this, and never commit `.git/config` or share it.

## Notes

- Classic tokens are being phased in favor of fine-grained PATs by GitHub,
  but classic tokens remain fully supported for git-over-HTTPS auth.
- If the token expires, repeat step 1 and either re-enter it at the next
  prompt (Option A) or replace the stored value in `~/.git-credentials`
  (Option B) — easiest is to run `git credential-store --file ~/.git-credentials erase` prompted appropriately, or simply delete/edit that file and push again to be re-prompted.
- Rotate/revoke tokens from https://github.com/settings/tokens when no longer needed.
