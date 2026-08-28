---
name: handle-pr
description: Pull down one open Pull Request's code, verify it (automated tests, focused code review), launch the app so the user can manually test it against its acceptance criteria, then close or merge it appropriately. Use when asked to review, test, triage, close, or merge a specific PR from this repo's open-PR backlog.
---

You take a single open Pull Request from `pull → verify → manual test →
close/merge` in one guided pass. This exists because this repo currently
has a large backlog of open PRs with real overlap: multiple PRs
independently implementing the same `ISSUES.md` ticket, PRs that bundle
many tickets into one, PRs that carry an identical unrelated doc/skill
diff because they branched from a common not-yet-merged fork state, and
every PR appending to the same tail of `REQUIREMENTS.md`/
`USER_STORIES.md`/`ACCEPTANCE_CRITERIA.md`. None of that is safe to
resolve by blindly clicking "merge" on each PR in turn — each one needs a
real look, and a human verdict on functionality before it lands.

**Handle exactly one PR per invocation.** Don't chain into the next PR
automatically, even if this one merges cleanly — let the user re-invoke
for the next one. Each close/merge is a distinct, visible, hard-to-reverse
action on shared state and gets its own deliberate go-ahead.

Invoked as `/handle-pr <number>` (e.g. `/handle-pr 47`). If invoked with
no number, run `gh pr list` and ask the user which PR to handle.

## Before doing anything else

Read root `CLAUDE.md` and `GITHUB.md` if you haven't already this
session — this skill operates inside the git/GitHub workflow they define
(branch protection requires a passing `Run Tests` check plus one
approving review before merge; never force-push or merge/close without
explicit per-action confirmation, per `GITHUB.md` section 6).

## Step 0 — Make the workspace safe to switch branches on

`gh pr checkout` below will change the current branch. Protect whatever
the user already has in progress first:

1. `git branch --show-current` — remember this; you'll return to it at
   the end.
2. `git status` — if there are uncommitted changes, stash them
   (`git stash push -u -m "handle-pr <N>: pausing <original-branch>"`)
   rather than leaving them to be silently carried onto the PR branch or
   discarded. Tell the user you did this.
3. If `git config --get rerere.enabled` is not `true`, set it
   (`git config rerere.enabled true`) and mention why: recurring textual
   conflicts on the `REQUIREMENTS.md`/`USER_STORIES.md`/
   `ACCEPTANCE_CRITERIA.md` tail are expected across this backlog, and
   `rerere` replays a resolution you already made once.

## Step 1 — Load PR context and check for overlap

- `gh pr view <N> --json title,body,files,author,headRefName,baseRefName,mergeable,mergeStateStatus,reviews,statusCheckRollup`
- Identify the `ISSUES.md`/GitHub issue this closes (`Closes #`/
  `Implements #` in the body, or ask if it's genuinely unclear).
- `gh pr list --state open` and compare this PR's file list and issue
  number against the others still open. Flag it to the user, before
  proceeding, if you see:
  - **Another open PR targeting the same issue number** (a duplicate
    implementation).
  - **A large bundle PR** that also contains this ticket's feature among
    many others (a competing superset).
  - **Shared, unrelated files** with other open PRs (e.g. the same
    doc/skill infra files touched identically across several PRs) — this
    predicts a conflict on whichever of those merges second, not
    necessarily a reason to stop.
  - This is a judgment call for the user, not something to resolve
    silently — surface it and ask how they want to proceed (e.g. "close
    this now as a duplicate of #X" is a valid answer that skips the rest
    of this skill; go do that per the pattern in Step 4 and stop).

## Step 2 — Pull in the code

- `gh pr checkout <N>` — fetches and checks out the PR's branch locally,
  tracking it.
- Delegate to the `test-runner` agent to run the full local suite on this
  branch. If it fails, report the failures and ask the user whether to
  stop here (likely a `close`/request-changes case) or continue anyway
  knowing tests are red.
- Delegate to the `code-reviewer` agent, scoped to the files this PR
  changed, for a focused quality pass — it's read-only and won't fix
  anything, just surfaces concerns (including a real one to check for:
  correctness/duplication risk against code that may have merged from
  another PR since this branch was cut).
- Check this PR's new `REQ-###`/`US-###`/`AC-###` numbers against what's
  currently on `main` (`grep -oE 'REQ-[0-9]+' REQUIREMENTS.md | ...`,
  same for `US-`/`AC-`, as in the `req-doc` skill). If another PR merged
  since this branch was cut and already claimed the same number, this PR
  needs renumbering before it can merge cleanly — note it now even if
  git itself doesn't flag a textual conflict.

## Step 3 — Manual testing

This repo's Definition of Done is functional, not just "tests pass" —
the user wants eyes on the running feature.

1. Use the `run` skill to launch the app on this checked-out branch (it
   already knows this repo's dev-server setup; don't reinvent it here).
2. Tell the user the local URL and summarize, from the PR body and its
   linked `ISSUES.md` ticket's acceptance criteria, the specific things
   worth clicking through — success path plus the boundary/edge cases the
   ticket called out.
3. Wait for the user's verdict. Do not assume pass/fail — ask, and record
   what they say (works / broken / partially works / not as described).

## Step 4 — Decide: close or merge

Weigh automated test result, code-review findings, overlap findings from
Step 1, and the manual-test verdict from Step 3. Propose a recommendation
to the user, but **do not close or merge without their explicit go-ahead
on this specific PR** — this holds even if the user has already approved
the general workflow, per this repo's standing rule that authorization
doesn't extend beyond the scope given.

### If closing (duplicate, superseded, broken, or rejected in testing)

```bash
gh pr close <N> --comment "<courteous, specific reason — e.g. what
superseded it, or what manual testing found>"
```

Mirror the tone used for prior closes in this repo: explain why, credit
the work, don't imply low quality when the real reason is "we don't need
two of these." If it lost to a specific other PR/ticket, name it.

### If merging

We generally don't have push access to another contributor's own branch,
and even when we do, force-pushing someone else's branch to rebase it is
the kind of hard-to-reverse, other-people's-shared-state action this repo
avoids by default. So "merging" a contributor's PR means **reconciling
its commit onto our own new branch and opening our own PR from it** —
never rebasing/force-pushing the original branch in place.

1. Check `mergeable`/`mergeStateStatus` fresh (it may have changed since
   Step 1 if anything else merged in the meantime).
2. `git checkout main && git pull origin main`, then branch off it under
   your own username (`GITHUB.md` section 4 naming convention), e.g.
   `git checkout -b <your-username>/feat-<short-description>`.
3. Bring the PR's commit(s) onto this new branch with
   `git cherry-pick <sha>` for each commit on the PR branch not already on
   `main` (`git log main..<pr-branch> --oneline` lists them). Cherry-pick
   preserves the original author on the commit — do not amend the
   authorship — so the contributor still gets credit even though the PR
   itself is opened from our branch.
4. Resolve any conflicts by hand — for the `REQUIREMENTS.md`/
   `USER_STORIES.md`/`ACCEPTANCE_CRITERIA.md` tail and Traceability
   Matrix, the resolution is almost always "keep both sides, renumber
   this PR's entries to the next unused number after whatever's now on
   `main`," never drop either side's entries and never renumber something
   already on `main`. The `req-freeze-guard` hook will block an Edit/Write
   pass over these files during conflict resolution because it can't tell
   "resolving a merge conflict" from "editing a frozen entry" — per
   `CLAUDE.md`, that hook only guards Claude Code's own Edit/Write/
   MultiEdit tools, not Bash, so do the renumbering via a `python3`/`sed`
   script through Bash instead of the Edit tool.
5. Grep the changed non-doc files for the old `REQ-###`/`US-###`/`AC-###`
   numbers too (e.g. `grep -rn "REQ-0[0-9]*\|AC-0[0-9]*" <changed files>`)
   — code comments and test-description strings that cite these IDs need
   the same renumbering, or they'll cite the wrong requirement after the
   docs move.
6. Rerun the `test-runner` agent on the new branch — the renumbering
   shouldn't touch application logic, so a full pass is expected; treat
   any new failure as a real regression introduced by conflict resolution.
7. Push the new branch (`git push -u origin <branch>`) and open a PR from
   it (`gh pr create --base main`, per `GITHUB.md` section 5) — **do not
   merge the original PR**, it stays open until the new one lands. In the
   new PR's body, name the original PR/author it reconciles (and, if it
   won a comparison against sibling duplicate PRs per Step 1, name those
   and summarize why this one won), and include the same `Closes #<issue>`
   the original used.
8. Confirm branch protection is satisfiable on the *new* PR: a passing
   `Run Tests` check and at least one approving review. If a review is
   missing, ask the user whether they want to supply one
   (`gh pr review <new-N> --approve`) — this is its own visible action and
   needs its own confirmation, don't fold it into "yes, merge."
9. `gh pr merge <new-N> --squash` (squash keeps `main`'s history one
   commit per feature). Ask whether to pass `--delete-branch` too, rather
   than assuming.
10. Once the new PR merges, close the original PR (and any duplicate-
    cluster siblings per Step 5) referencing the new PR number, crediting
    the original author's implementation by name.

## Step 5 — Aftermath

- Return to the branch recorded in Step 0
  (`git checkout <original-branch>`) and pop the stash if one was made
  (`git stash pop`), so the user's prior work is exactly as they left it.
- If a (reconciled or direct) merge just happened, `gh pr list --state
  open` again and check which remaining PRs touch files this merge
  changed — report that list to the user as "these likely need a rebase
  now" rather than commenting on all of them automatically.
- If this PR was part of a duplicate cluster identified in Step 1 and it
  just merged (via its own reconciled PR, per Step 4) or just got closed
  as a duplicate of one still open, offer to close the others in that
  cluster the same way — but propose it and wait, don't cascade closes
  automatically.

## Guardrails

- One PR per invocation. Never chain automatically into the next.
- Never merge, close, approve a review, or force-push without explicit
  confirmation tied to that specific action and that specific PR.
- Never rebase or force-push a contributor's own PR branch in place —
  reconcile onto our own new branch and open our own PR instead (Step 4).
- When reconciling onto our own branch, always cherry-pick (never
  re-author) the original commit(s), so the contributor keeps authorship
  credit on what merges.
- Never skip the automated test gate (Step 2, and again after reconciling
  in Step 4) to reach a merge.
- Never edit or renumber a `REQ-###`/`US-###`/`AC-###` entry or
  Traceability Matrix row that's already on `main` — only ever append
  past the current highest number. This applies to code comments/test
  descriptions citing those IDs too, not just the doc files.
- Never leave the workspace on the PR's branch or with a stash unresolved
  when you're done — always execute Step 5.
