---
name: req-doc
description: Draft REQUIREMENTS.md/USER_STORIES.md/ACCEPTANCE_CRITERIA.md entries (REQ/US/AC, next unused numbers, cross-referenced) as the target spec for a ticket *before* implementing it, and reconcile them against the real implementation before the PR opens, following this repo's documentation contract and house style.
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

For each file, find the highest existing number and add 1:

```bash
grep -oE 'REQ-[0-9]+' REQUIREMENTS.md | grep -oE '[0-9]+' | sort -n | tail -1
grep -oE 'US-[0-9]+'  USER_STORIES.md | grep -oE '[0-9]+' | sort -n | tail -1
grep -oE 'AC-[0-9]+'  ACCEPTANCE_CRITERIA.md | grep -oE '[0-9]+' | sort -n | tail -1
```

Never reuse or renumber an existing entry. **Always append** — this file's
own stated policy is "Numbering is appended rather than interleaved so
that the original numbering is preserved unchanged," and that rule holds
regardless of which pass/mode produced the entry. If you're doing a
reconcile pass on a draft made earlier in the same ticket, keep the
numbers you already drafted — only recompute if another ticket's entries
landed on `main` in the meantime and took your numbers (check
`git log main...HEAD` for upstream commits touching these three files).

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
  somehow lacks it — today it exists, after `REQ-040`).
- **Get the insertion point right on the first try.** A pre-commit guard
  in this repo blocks any edit that would remove or alter an existing
  `REQ-###` entry's text — including moving it to fix ordering after the
  fact, even within the same uncommitted change. Before inserting, run
  `grep -n '^### REQ-' REQUIREMENTS.md | tail -1` to find the true last
  entry, and anchor your `Edit`'s `old_string` on text *after* that
  entry's full body ends (not on that entry's heading, which would insert
  before it instead of after). If you land an entry out of numeric order
  by mistake, do not try to fix it with a follow-up edit — the guard will
  reject it as "removing" the entry; leave the ordering as-is and flag it
  in your message back to the user instead.

## Step 5 — Draft the US entry

Format, matching every existing entry in `USER_STORIES.md`:

```
**US-###** — As a <role>, I want <capability>, so that <benefit>.
*Related requirements: REQ-###[, REQ-###...]*
```

Append to the end of `USER_STORIES.md`.

## Step 6 — Draft the AC entries and the traceability row

In `ACCEPTANCE_CRITERIA.md`, append:

```
### US-### — <short title>
*(REQ-###[, REQ-###...])*

- **AC-###** — Given <state>, when <action>, then <outcome>.
```

One or more `AC-###` bullets per story, as needed to cover the behavior's
distinct cases (success path, each rejected/boundary case). Then append
the matching row(s) to the **Traceability Matrix** table at the bottom of
the same file, in the same `| REQ-### | US-### | AC-###[–AC-###] |` format
as the existing rows.

## Worked example to match

The most recent real additions to this repo are the canonical style
reference — read them directly before drafting anything new:

- `REQUIREMENTS.md`: `REQ-046` (single requirement) and `REQ-047`–`048`
  (a pair added together for one feature).
- `USER_STORIES.md`: `US-027` and `US-028`.
- `ACCEPTANCE_CRITERIA.md`: `AC-074`–`075` and `AC-076`–`079`, plus their
  Traceability Matrix rows.

Match that formatting exactly — heading style, em-dash usage, bullet
structure, cross-reference syntax.

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
  Traceability Matrix row.
- In a reconcile pass (or amendment mode), never document behavior you
  haven't verified in the actual code/tests. In a draft pass, it's
  expected that entries describe intended-but-not-yet-verified behavior —
  say so, and make sure a reconcile pass happens before the PR opens.
- Never touch `ISSUES.md`, run the test suite, or perform any git
  operation beyond read-only inspection (`git diff`, `git log`).
- If the change spans multiple distinct behaviors, draft one `REQ-###` per
  distinct behavior rather than cramming unrelated behavior into one entry
  — matches how existing requirements are scoped.
