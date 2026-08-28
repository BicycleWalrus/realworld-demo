---
name: req-doc
description: Draft REQUIREMENTS.md/USER_STORIES.md/ACCEPTANCE_CRITERIA.md entries (REQ/US/AC, ticket-scoped IDs to avoid cross-branch collisions, cross-referenced) as the target spec for a ticket *before* implementing it, and reconcile them against the real implementation before the PR opens, following this repo's documentation contract and house style.
---

You draft new, numbered `REQ-###` / `US-###` / `AC-###` entries — plus the
matching row(s) in `ACCEPTANCE_CRITERIA.md`'s Traceability Matrix — for a
ticket's behavior, in this repo's exact existing style. You apply the
edits directly, then stop and show the diff for the user to review. You
never stage, commit, or push.

This exists because `CLAUDE.md`'s "Adding new behavior (spec-first)"
section and `ISSUES.md`'s Definition of Done require every ticket's
behavior to be spec'd in these three files *before* implementation, and
then reconciled against the real, verified implementation before the PR
opens. Getting that formatting and numbering right by hand, every ticket,
twice, is exactly the kind of repetitive, easy-to-get-subtly-wrong work
worth automating.

## Before doing anything else

Read, in order:

1. Root `CLAUDE.md`, especially "Adding new behavior (spec-first)".
2. `REQUIREMENTS.md`, `USER_STORIES.md`, `ACCEPTANCE_CRITERIA.md` — in
   full, not just the tail. You need the numbering, tone, and cross-
   reference conventions from the *whole* file, not just the most recent
   entries.
3. `frontend/src/CLAUDE.md` if the change touches `frontend/src/`, and/or
   `test/CLAUDE.md` if you'll be reasoning about test coverage.

## Step 1 — Pick a pass: draft or reconcile

- **Draft pass (the normal case, run first, before any implementation
  code exists)** — you're turning a ticket/issue description into the
  target spec for work about to begin. Source material is the
  ticket/issue text (`gh issue view <N>` if invoked with a number, or the
  free-text description if invoked with one) — there is no code yet to
  verify against, so draft from the description as given, using its
  summary/user story/acceptance criteria. Mark this clearly as a draft in
  your message back to the user (e.g. "drafted as the spec to build
  against — not yet verified against an implementation").
- **Reconcile pass (run once implementation + tests exist, before the PR
  opens)** — you're checking previously-drafted entries (or, for
  amendment-mode tickets, entries about to be written for the first time
  against already-existing code) against what was actually built. Run
  `git diff main...HEAD` and `git log main..HEAD --oneline` to see the
  real changes, then **read the actual touched source and its tests**.
  The code and tests are the only authority on what the behavior
  *actually is*, including edge cases, error-handling paths, and boundary
  conditions (this repo's `REQ-###` entries are full of exactly those —
  e.g. `REQ-017`'s falsy-vs-empty distinction, `REQ-020`'s
  untrimmed-length quirk). Update any drafted entry that diverges from
  the real implementation so it describes verified behavior, not
  intention. If no draft exists yet for this ticket (e.g. you're
  documenting an amendment — see Step 2), draft directly from code/tests
  in this pass — never from description alone.

If you're unsure which pass applies, ask: "has any of this ticket's code
been written yet?" No code yet → draft pass. Code exists → reconcile
pass.

## Step 2 — Pick a mode

- **New behavior** — spec'ing (or reconciling the spec for) a ticket that
  adds behavior that didn't exist before. This is the normal case for an
  `ISSUES.md` ticket, and normally goes through both passes above.
- **Amendment** — you're documenting a special case in code that already
  existed but was never captured in `REQUIREMENTS.md`. This is exactly
  why the `## Amendments` section of `REQUIREMENTS.md` exists today
  (`REQ-041`–`048` were "added after a documentation review found special
  cases present in the code but not yet captured above"). Use this mode
  for bugfix/incident-style tickets, or when you notice undocumented
  existing behavior while working on something else — this mode only
  ever runs a reconcile-style pass (draft directly from code/tests),
  since the behavior already exists.

Both modes produce the same shape of entry and go through the same steps
below — the only difference is what you're reading to derive them (a
ticket description for a draft pass vs. a diff of new or existing code
for a reconcile pass).

## Step 3 — Compute next numbers

**IDs are ticket-scoped, not globally sequential, for anything tracing to
an `ISSUES.md` ticket.** Two branches drafting entries for two different
tickets against the same base `main` used to collide on the next global
number (this happened for real — Issue #1 and Issue #7 both drafted
`REQ-049` against the same pre-existing `main`). Scoping the ID to the
ticket number makes that structurally impossible: two tickets can't share
a ticket number, so their entries can't share a key, regardless of what
else has landed on `main` or on some other open branch.

- **Legacy entries** (roughly `REQ-001`–`REQ-048`/`US-001`–`US-028`/
  `AC-001`–`AC-079`, reconstructed from the app before `ISSUES.md`
  existed, not tied to a single ticket) keep their existing bare
  `REQ-###`/`US-###`/`AC-###` form. Never retrofit these to the scoped
  form, and never add a new *bare*-numbered entry going forward.
- **Anything drafted for an `ISSUES.md` ticket** (the normal case — see
  Step 2) uses `<TYPE>-<issue>.<n>`, e.g. `REQ-7.1`, `REQ-7.2`, `US-7.1`,
  `AC-7.1`, `AC-7.2` for ticket #7. `<n>` is local to that ticket, starting
  at 1: find the highest existing `.<n>` suffix for that issue number in
  each file and add 1 (or start at 1 if none exist yet):

  ```bash
  grep -oE "REQ-7\.[0-9]+" REQUIREMENTS.md | grep -oE '[0-9]+$' | sort -n | tail -1
  grep -oE "US-7\.[0-9]+"  USER_STORIES.md | grep -oE '[0-9]+$' | sort -n | tail -1
  grep -oE "AC-7\.[0-9]+"  ACCEPTANCE_CRITERIA.md | grep -oE '[0-9]+$' | sort -n | tail -1
  ```

  (substitute the actual issue number for `7`). Use the scoped `.1` form
  even when a ticket only needs one `REQ`/`US`/`AC` entry — don't shorten
  it to a bare `REQ-7`, since a later amendment to the same ticket would
  then be ambiguous about whether `.1` was ever implied.
- **Amendment mode** for undocumented existing behavior not tied to a
  current ticket (see Step 2) has no ticket number to scope to — use the
  next bare sequential number instead, same as today.

Never reuse or renumber an existing entry. **Always append.** If you're
doing a reconcile pass on a draft made earlier in the same ticket, keep
the numbers you already drafted — they can't have been taken by another
ticket's entries, by construction; you'd only ever need to recompute if
this same ticket's own entries changed shape (e.g. an AC split in two)
before the PR opens.

## Step 4 — Draft the REQ entry

- Observable behavior only — no implementation detail (no variable names,
  no internal function names). State what the system *does* (draft pass:
  what it's intended to do; reconcile pass: what it verifiably does), the
  way every existing `REQ-###` does.
- Call out boundary/special cases explicitly with a **Boundary:** or
  **Special case:** paragraph when relevant (see `REQ-011`, `REQ-017`,
  `REQ-020` for the pattern). In a draft pass, boundary cases come from
  the ticket's stated constraints/acceptance criteria; in a reconcile
  pass, from what the code/tests actually show.
- Append it under the `## Amendments` heading at the end of
  `REQUIREMENTS.md` (create that heading only if a future repo state
  somehow lacks it — today it exists, after `REQ-040`). Use the ticket-
  scoped ID (`REQ-<issue>.<n>`, Step 3) in the heading, e.g.
  `### REQ-7.1 — <title>`; only amendment-mode entries (no ticket) use a
  bare `### REQ-<n>` heading.

## Step 5 — Draft the US entry

Format, matching every existing entry in `USER_STORIES.md` (using the
ticket-scoped ID from Step 3 — `US-<issue>.<n>` — for anything tracing to
an `ISSUES.md` ticket; bare `US-<n>` only for amendment mode):

```
**US-7.1** — As a <role>, I want <capability>, so that <benefit>.
*Related requirements: REQ-7.1[, REQ-7.2...]*
```

Append to the end of `USER_STORIES.md`.

## Step 6 — Draft the AC entries and the traceability row

In `ACCEPTANCE_CRITERIA.md`, append (same ticket-scoping rule for the IDs):

```
### US-7.1 — <short title>
*(REQ-7.1[, REQ-7.2...])*

- **AC-7.1** — Given <state>, when <action>, then <outcome>.
```

One or more `AC-<issue>.<n>` bullets per story, as needed to cover the
behavior's distinct cases (success path, each rejected/boundary case) —
`<n>` keeps counting up across the whole ticket, not restarting per story.
Then append the matching row(s) to the **Traceability Matrix** table at
the bottom of the same file, in the same
`| REQ-<issue>.<n> | US-<issue>.<n> | AC-<issue>.<n>[–AC-<issue>.<n>] |`
format as the existing rows.

## Worked example to match

The most recent real additions to this repo are the canonical style
reference for prose/formatting — read them directly before drafting
anything new:

- `REQUIREMENTS.md`: `REQ-046` (single requirement) and `REQ-047`–`048`
  (a pair added together for one feature).
- `USER_STORIES.md`: `US-027` and `US-028`.
- `ACCEPTANCE_CRITERIA.md`: `AC-074`–`075` and `AC-076`–`079`, plus their
  Traceability Matrix rows.

Match that formatting exactly — heading style, em-dash usage, bullet
structure, cross-reference syntax. These examples predate the ticket-
scoped ID scheme (Step 3), though — they still use bare `REQ-###` because
they were amendment-mode entries, not ticket-tracked ones. No merged
example of the scoped form (`REQ-7.1`, etc.) exists yet; construct it
directly from Step 3's rule, keeping everything else about the prose/
formatting identical to these examples.

## Step 7 — Apply and stop

Apply the drafted/reconciled entries with `Edit`. Then run `git diff`
over the three files and show it to the user, stating clearly whether
this was a **draft pass** (spec not yet verified — implementation still
to come) or a **reconcile pass** (verified against real code/tests, ready
to accompany the PR). **Do not** run `git add`, `git commit`, or
`git push`, and do not touch `ISSUES.md` or GitHub issues — committing and
opening a PR is `GITHUB.md`'s job, not this skill's.

## Guardrails

- Never edit or renumber any existing `REQ-###`/`US-###`/`AC-###` entry or
  Traceability Matrix row — a pre-commit hook
  (`.claude/hooks/req-freeze-guard.cjs`) mechanically rejects this, even
  for an entry added earlier in the same uncommitted session; there is no
  "it's not committed yet, so it's still fixable" exception. Get the ID
  and insertion point right before applying.
- Never use a bare `REQ-<n>`/`US-<n>`/`AC-<n>` ID for a ticket-tracked
  entry — always scope it to the issue number (Step 3). Bare IDs are
  reserved for legacy/amendment-mode entries with no ticket.
- In a reconcile pass (or amendment mode), never document behavior you
  haven't verified in the actual code/tests. In a draft pass, it's
  expected that entries describe intended-but-not-yet-verified behavior —
  say so, and make sure a reconcile pass happens before the PR opens.
- Never touch `ISSUES.md`, run the test suite, or perform any git
  operation beyond read-only inspection (`git diff`, `git log`).
- If the change spans multiple distinct behaviors, draft one `REQ-###` per
  distinct behavior rather than cramming unrelated behavior into one entry
  — matches how existing requirements are scoped.
