---
name: req-doc
description: Draft REQUIREMENTS.md/USER_STORIES.md/ACCEPTANCE_CRITERIA.md entries (REQ/US/AC, next unused numbers, cross-referenced) for a behavior change just made or described, following this repo's documentation contract and house style.
---

You draft new, numbered `REQ-###` / `US-###` / `AC-###` entries — plus the
matching row(s) in `ACCEPTANCE_CRITERIA.md`'s Traceability Matrix — for a
behavior change, in this repo's exact existing style. You apply the edits
directly, then stop and show the diff for the user to review. You never
stage, commit, or push.

This exists because `CLAUDE.md`'s documentation contract and `ISSUES.md`'s
Definition of Done (item 3) require every behavior change in this repo to
be reflected in these three files, using the next unused number, cross-
referenced, "following the existing conventions." Getting that formatting
and numbering right by hand, every ticket, is exactly the kind of
repetitive, easy-to-get-subtly-wrong work worth automating.

## Before doing anything else

Read, in order:

1. Root `CLAUDE.md`.
2. `REQUIREMENTS.md`, `USER_STORIES.md`, `ACCEPTANCE_CRITERIA.md` — in
   full, not just the tail. You need the numbering, tone, and cross-
   reference conventions from the *whole* file, not just the most recent
   entries.
3. `frontend/src/CLAUDE.md` if the change touches `frontend/src/`, and/or
   `test/CLAUDE.md` if you'll be reasoning about test coverage.

## Step 1 — Determine what changed

Figure out the actual behavior to document, in this priority order:

- **If invoked with an issue number** (e.g. `/req-doc #4`), run
  `gh issue view <N>` and use its summary/user story/acceptance criteria
  as source material.
- **If invoked with free-text** (a description of the change), treat that
  as the starting point.
- **If invoked with no arguments**, run `git diff main...HEAD` and
  `git log main..HEAD --oneline` to see what the current branch changed.

In every case, **then read the actual touched source and its tests** —
never draft an entry from the description or issue text alone. The
description tells you *what to look for*; the code and tests are the only
authority on what the behavior *actually is*, including edge cases,
error-handling paths, and boundary conditions (this repo's `REQ-###`
entries are full of exactly those — e.g. `REQ-017`'s falsy-vs-empty
distinction, `REQ-020`'s untrimmed-length quirk). If you can't verify the
described behavior against code/tests, stop and ask the user rather than
inventing it — do not draft speculative requirements.

## Step 2 — Pick a mode

- **New behavior** — the diff/issue shows code that didn't exist before.
  This is the normal case for an `ISSUES.md` ticket.
- **Amendment** — you're documenting a special case in code that already
  existed but was never captured in `REQUIREMENTS.md`. This is exactly
  why the `## Amendments` section of `REQUIREMENTS.md` exists today
  (`REQ-041`–`048` were "added after a documentation review found special
  cases present in the code but not yet captured above"). Use this mode
  for bugfix/incident-style tickets, or when you notice undocumented
  existing behavior while working on something else.

Both modes produce the same shape of entry and go through the same steps
below — the only difference is what you're reading to derive them (a diff
of new code vs. an existing code path).

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
regardless of which mode (Step 2) produced the entry.

## Step 4 — Draft the REQ entry

- Observable behavior only — no implementation detail (no variable names,
  no internal function names). State what the system *does*, the way
  every existing `REQ-###` does.
- Call out boundary/special cases explicitly with a **Boundary:** or
  **Special case:** paragraph when relevant (see `REQ-011`, `REQ-017`,
  `REQ-020` for the pattern).
- Append it under the `## Amendments` heading at the end of
  `REQUIREMENTS.md` (create that heading only if a future repo state
  somehow lacks it — today it exists, after `REQ-040`).

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

Apply the drafted entries with `Edit`. Then run `git diff` over the three
files and show it to the user. **Do not** run `git add`, `git commit`, or
`git push`, and do not touch `ISSUES.md` or GitHub issues — committing and
opening a PR is `GITHUB.md`'s job, not this skill's.

## Guardrails

- Never edit or renumber any existing `REQ-###`/`US-###`/`AC-###` entry or
  Traceability Matrix row.
- Never document behavior you haven't verified in the actual code/tests.
- Never touch `ISSUES.md`, run the test suite, or perform any git
  operation beyond read-only inspection (`git diff`, `git log`).
- If the change spans multiple distinct behaviors, draft one `REQ-###` per
  distinct behavior rather than cramming unrelated behavior into one entry
  — matches how existing requirements are scoped.
