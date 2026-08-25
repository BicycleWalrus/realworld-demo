# Feature Backlog — Advanced Course Assignment

The "add a new feature" backlog for this assignment. These 20 tickets are
also filed as [GitHub Issues](https://github.com/BicycleWalrus/realworld-demo/issues)
on this repo (same numbering, `#1`–`#20`) — this file is the retained,
readable copy of the same content, grouped with the shared context above.

## How to work a ticket

1. Set up the app locally — see `README.md`'s "Local development setup"
   section, and `npm test` should pass before you change anything.
2. Read `CLAUDE.md` (repo root) and, if you're touching frontend code,
   `frontend/src/CLAUDE.md` — this is a legacy codebase with a
   documentation contract; both explain what that means before you start
   editing.
3. Pick an unclaimed issue from the GitHub Issues list (check the
   assignee) and self-assign it — see `GITHUB.md` section 4, "Claim your
   ticket first" — so no one else starts the same one. Check "Known
   overlap" below before picking one of the flagged pairs.
4. Build the feature, add tests (see `test/CLAUDE.md` for this repo's
   testing conventions), and extend `REQUIREMENTS.md` / `USER_STORIES.md`
   / `ACCEPTANCE_CRITERIA.md` per the Definition of Done below.
5. Open a PR referencing your issue (`Closes #<number>`) — see
   `GITHUB.md` section 5. It needs a passing `Run Tests` check and one
   approving review before it can merge into `main`.

## How to read this backlog

- **Size** is a rough solo-effort estimate for a ~4 hour session: `S`
  (~1–2 hrs core work, rest polish/tests), `M` (fills most of 4 hrs), `L`
  (tight for 4 hrs — pick this if you want a stretch).
- **Area** flags whether the work is backend, frontend, or both.
- Acceptance criteria describe **observable behavior**, not
  implementation. How you build it (schema shape, component structure,
  libraries) is your call.
- **Constraints** call out existing documented behavior (`REQ-###`) that
  your feature must not break. Read the cited requirement before you
  start.
- Every ticket shares the same **Definition of Done** — reproduced in
  full in each issue so it's self-contained on GitHub, but the substance
  is identical across all 20:
  1. Feature works end-to-end (backend + frontend, where applicable).
  2. Automated tests cover the new behavior (mirror existing test style
     in `backend/**/*.test.js` / `frontend/src/**/*.test.js`).
  3. `REQUIREMENTS.md`, `USER_STORIES.md`, and `ACCEPTANCE_CRITERIA.md`
     are each extended with new, numbered entries for this feature,
     following the existing `REQ-###`/`US-###`/`AC-###` conventions and
     cross-referencing each other (see the `REQ-046`/`US-027`
     "Pending Changes" entries for the established pattern). **Use the
     next unused number at the time you open your PR** — don't hardcode
     a number from this doc, since other tickets may land first.
  4. No existing `REQ-001`–`REQ-046` behavior changes, unless a
     constraint below explicitly says this feature supersedes one.
  5. PR opened following `GITHUB.md`.

## Known overlap — coordinate before starting

- **#4 (Trending feed tab)** and **#20 (Multi-tag filtering)** both touch
  the article-listing endpoint's query handling. Avoid picking both at
  once unless you plan to rebase carefully.
- **#11 (Read-later list)** and **#14 (Multi-reaction articles)** both
  add a new per-user/per-article join table adjacent to `Favorites`.
  Same caution.

---

## Issue 1 — Dark mode / theme toggle

**Size:** M · **Area:** Frontend

### Summary

Add a dark color theme the user can switch to, in addition to the
current (light) appearance, without breaking any existing page.

### User story

As a user, I want to switch the site to a dark color theme, so that I
can read comfortably in low light and according to my own preference.

### Acceptance criteria

- A control (e.g. in the navbar) lets a visitor toggle between light and
  dark themes at any time, on any page.
- The chosen theme persists across page reloads and new visits (for that
  browser).
- If the visitor has never chosen a theme, the site defaults to their OS/
  browser color-scheme preference where available.
- All existing pages and components remain legible and usable in both
  themes — no unreadable text, no invisible borders/icons.
- Switching themes does not require a page reload.

### Constraints

- Purely additive: the current (light) look must remain available and
  pixel-equivalent to today when the dark theme is not selected.

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 2 — Author profile stats

**Size:** M · **Area:** Full-stack

### Summary

Expand a user's profile page beyond bio + article tabs into a fuller
author identity: how many articles they've published, how many total
favorites those articles have received, and how long they've been a
member.

### User story

As a visitor, I want to see an author's article count, total favorites
received, and member-since date on their profile, so that I can gauge
who they are and how established they are on the platform before
reading their work.

### Acceptance criteria

- A profile page (`/profile/:username`) displays the author's total
  published article count.
- It displays the total favorite count summed across all of that
  author's articles.
- It displays a member-since date, formatted consistently with existing
  date display elsewhere in the app.
- These stats are visible to both authenticated and anonymous visitors.
- Stats reflect current data (e.g. deleting an article updates the
  count) — they don't need to be real-time/live-updating within an open
  page, just correct on load.

### Constraints

- Must not change the existing "My Articles" / "Favorited Articles" tab
  behavior on the profile page.
- `User.toJSON()` currently strips `createdAt` — you'll need to decide
  how member-since data reaches the client without exposing more than
  intended.

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 3 — Article keyword search

**Size:** M · **Area:** Full-stack

### Summary

Let users search articles by keyword, matching against title,
description, and/or body, in addition to the existing author/tag/
favorited filters.

### User story

As a user, I want to search for articles by keyword, so that I can find
content on a topic without knowing the exact author or tag.

### Acceptance criteria

- A search input is available to enter a keyword and view matching
  articles.
- Search results include articles whose title, description, or body
  contain the keyword (case-insensitive).
- Search results respect the existing pagination page size (3 per page).
- An empty or whitespace-only search does not error and has a sensible,
  documented behavior (e.g. no results, or full listing — your call, but
  document it).
- Search can be combined with, or is clearly independent from, the
  existing author/tag/favorited filters — document which.

### Constraints

- Do not remove or change the existing `author` / `tag` / `favorited`
  filters (`REQ-013`) or the default page size (`REQ-031`).

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 4 — Trending / Top Articles feed tab

**Size:** M · **Area:** Full-stack

### Summary

Add a third feed option, alongside "Your Feed" and "Global Feed", that
shows articles ordered by popularity (favorite count) rather than
recency.

### User story

As a user, I want to browse articles sorted by how many favorites
they've received, so that I can discover the most well-received content
on the platform.

### Acceptance criteria

- A new tab (e.g. "Top Articles") is available next to the existing feed
  tabs and is selectable by any visitor, logged in or not.
- Selecting it lists articles ordered by favorite count, highest first,
  with a defined tie-break (e.g. newest first among equal counts).
- The new tab uses the same pagination page size as other listings
  (`REQ-031`).
- Switching between tabs behaves consistently with the existing tab
  switching (no stale data shown across tabs).

### Constraints

- Do not change the default tab selection logic for "Your Feed" /
  "Global Feed" (`REQ-030`).
- Coordinate with issue #20 (Multi-tag (AND) filtering) before starting —
  both touch the article-listing endpoint's query handling; avoid picking
  both at once unless you plan to rebase carefully.

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 5 — Comment editing

**Size:** S/M · **Area:** Full-stack

### Summary

Allow a comment's author to edit its text after posting, rather than
only being able to delete and repost.

### User story

As a comment author, I want to edit my own comment, so that I can fix a
mistake or clarify what I said without deleting the whole comment and
losing the thread position/replies context.

### Acceptance criteria

- Only the comment's author can edit it; any other authenticated user
  attempting to edit is rejected, mirroring the existing delete
  ownership rule (`REQ-023`).
- An unauthenticated visitor cannot edit a comment.
- Editing requires a non-empty body, consistent with comment creation
  (`REQ-022`).
- After a successful edit, the updated text is what's displayed on
  subsequent loads (not just optimistically in the current session).
- The edit control is only shown to the comment's author.

### Constraints

- Do not change comment creation (`REQ-022`) or deletion (`REQ-023`,
  `REQ-042`) behavior.

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 6 — Draft / publish workflow for articles

**Size:** L · **Area:** Full-stack

### Summary

Let an author save an article as an unpublished draft, visible only to
themselves, and publish it later — instead of every created article
being immediately public.

### User story

As an author, I want to save an article as a draft before publishing it,
so that I can write and revise content over time without exposing
unfinished work.

### Acceptance criteria

- When creating or editing an article, an author can save it as a draft
  instead of publishing it immediately.
- Draft articles do not appear in the global feed, the personalized
  feed, other users' profile "My Articles" tabs, search, or tag
  filtering, for anyone other than the author.
- The author can see and access their own drafts (e.g. from their own
  profile) and continue editing them.
- The author can publish a draft, after which it appears in listings
  like any other article.
- A non-author (including anonymous visitors) cannot view a draft
  article directly, even by slug.

### Constraints

- This intentionally narrows "any created article is public" — document
  it as a superseding amendment to the relevant creation/listing
  requirements rather than silently contradicting them.
- Must not change ownership rules for editing/deleting (`REQ-016`).

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries (explicitly noting which prior
      requirement, if any, this amends)
- [ ] PR opened per `GITHUB.md`

---

## Issue 7 — User directory page

**Size:** M/L · **Area:** Full-stack

### Summary

Add a browsable, paginated list of all authors on the platform — today
a profile can only be reached by already knowing a username (e.g. via an
article byline).

### User story

As a user, I want to browse a directory of all authors, so that I can
discover new people to follow without already knowing their username.

### Acceptance criteria

- A page lists user profiles (username, avatar, bio snippet) with
  pagination.
- The directory is reachable without authentication (read access).
- Each entry links to that user's full profile.
- The list is usable at platform scale — i.e. it's paginated, not one
  unbounded query/render.

### Constraints

- Do not require authentication to browse the directory (consistent with
  `REQ-001`'s pattern for other read endpoints).

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 8 — Article cover image

**Size:** S · **Area:** Full-stack

### Summary

Let an author attach a cover image (by URL) to an article, shown on
article previews and the article detail page — mirroring how `User`
already has an `image` field.

### User story

As an author, I want to add a cover image to my article, so that it's
more visually distinctive in listings and on its own page.

### Acceptance criteria

- The article editor accepts an optional image URL when creating or
  updating an article.
- If set, the image is displayed on article preview cards and on the
  article detail page.
- If not set, existing layouts render exactly as they do today (no
  broken image, no layout shift from a missing-image placeholder unless
  you intentionally add one and document it).
- An invalid/unreachable URL does not break article creation or
  rendering (broken image is acceptable; a crash is not).

### Constraints

- Do not change article creation's required-field validation
  (`REQ-015`) — the image should be optional.

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 9 — @mentions in comments

**Size:** M · **Area:** Full-stack

### Summary

Let a comment author type `@username` and have it rendered as a link to
that user's profile, with basic autocomplete while typing.

### User story

As a user writing a comment, I want to mention another user by
username, so that the comment clearly references them and readers can
jump to their profile.

### Acceptance criteria

- While typing a comment, typing `@` followed by characters offers
  matching username suggestions to select from.
- Once posted, any `@username` pattern in a comment's rendered body
  that corresponds to an existing user is displayed as a link to that
  user's profile.
- An `@something` that does not match any existing username is
  displayed as plain text, not a broken link.
- This applies to newly created comments; you may decide (and must
  document) whether it also applies retroactively to existing comments
  at render time.

### Constraints

- Do not change comment body validation (`REQ-022`) — mentions are a
  rendering/UX layer on top of the existing free-text body.

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 10 — Threaded comment replies

**Size:** L · **Area:** Full-stack

### Summary

Let a user reply directly to a specific comment, with replies rendered
nested under their parent, instead of every comment being a flat,
top-level entry.

### User story

As a user, I want to reply to a specific comment, so that multi-person
discussion on an article is easy to follow.

### Acceptance criteria

- A comment has a "Reply" control (shown under the same auth rules as
  posting a top-level comment).
- A reply is visibly associated with (nested under, or otherwise clearly
  linked to) its parent comment.
- Replies support at least one level of nesting; you decide and document
  whether deeper nesting is supported.
- Deleting a parent comment has defined, documented behavior for its
  replies (e.g. cascade delete, or orphan-but-keep — pick one and state
  it in your `REQ-###` entry).
- Existing top-level comment creation/listing/deletion continue to work
  unchanged for comments with no parent.

### Constraints

- Must respect existing comment ownership rules for deletion
  (`REQ-023`).

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 11 — Read-later / bookmark list

**Size:** M · **Area:** Full-stack

### Summary

Let a user save an article to a private "read later" list, separate
from favoriting, which stays visible only to them.

### User story

As a user, I want to save an article to a personal reading list, so
that I can find it again later without publicly favoriting it.

### Acceptance criteria

- An authenticated user can add/remove an article to/from their
  read-later list.
- A dedicated view lists the current user's saved articles, most
  recently added first (or another defined order — document it).
- The read-later list is private: it is not visible to other users and
  does not affect the article's public favorite count.
- Attempting to save/unsave without authentication is rejected,
  consistent with how favoriting requires authentication (`REQ-025`).

### Constraints

- This is a distinct concept from `Favorite` (`REQ-025`/`REQ-026`) — do
  not reuse or alter the existing favorites table/behavior.
- Coordinate with issue #14 (Multi-reaction articles) before starting —
  both add a new per-user/per-article join table adjacent to `Favorites`;
  avoid picking both at once unless you plan to rebase carefully.

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 12 — Follow tags

**Size:** M/L · **Area:** Full-stack

### Summary

Let a user follow a tag, similar to following another user, and have
the personalized feed include articles carrying followed tags.

### User story

As a user, I want to follow a topic tag, so that my personalized feed
includes relevant articles even from authors I don't yet follow.

### Acceptance criteria

- An authenticated user can follow/unfollow a tag.
- The personalized feed (`REQ-018`) includes articles that either come
  from a followed author, carry a followed tag, or both — document the
  combination rule you choose.
- A user with no followed authors but at least one followed tag gets a
  non-empty personalized feed when matching articles exist (this is a
  deliberate change to the current "feed is empty if you follow no one"
  behavior — document it as an amendment).
- Following/unfollowing a tag requires authentication, consistent with
  how following a user does (`REQ-027`).

### Constraints

- This explicitly amends `REQ-018`'s "personalized feed = followed
  authors only" statement — call that out clearly in your doc update
  rather than leaving the two requirements silently contradictory.

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries (explicitly noting the amendment
      to `REQ-018`)
- [ ] PR opened per `GITHUB.md`

---

## Issue 13 — Reading time / word count badge

**Size:** S · **Area:** Frontend (or full-stack, your call)

### Summary

Show an estimated reading time (and/or word count) alongside an
article's date, on both preview cards and the article detail page.

### User story

As a reader, I want to see roughly how long an article will take to
read, so that I can decide whether to read it now.

### Acceptance criteria

- Article previews and the article detail page display an estimated
  reading time (e.g. "4 min read"), derived from the article body.
- The estimate updates when an article's body is edited.
- The estimate is shown consistently alongside the existing date display
  (`REQ-040`), without displacing or reformatting the date itself.
- Very short (e.g. near-empty) and very long bodies both produce a
  sensible, non-crashing estimate (e.g. minimum "1 min read", no
  division-by-zero or `NaN` display).

### Constraints

- Do not change the existing date formatting behavior (`REQ-040`).

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 14 — Multi-reaction articles

**Size:** M · **Area:** Full-stack

### Summary

Extend article engagement beyond a single "favorite" toggle to a small
set of distinct reactions (e.g. like, insightful, celebrate), each with
its own count.

### User story

As a reader, I want to react to an article with more than one kind of
response, so that I can express more than a single generic "favorite."

### Acceptance criteria

- An authenticated user can set one reaction (from a fixed, documented
  set) on an article, and change or remove it.
- An article's representation includes a per-reaction-type count,
  visible to anonymous and authenticated visitors alike.
- An anonymous visitor sees accurate counts but cannot react
  (consistent with the existing favorite-requires-auth pattern,
  `REQ-025`).
- You decide, and must document, the relationship to the existing
  favorite feature: whether reactions replace it, sit alongside it, or
  favoriting becomes one specific reaction type.

### Constraints

- If favoriting (`REQ-025`/`REQ-026`) is kept as a separate, independent
  concept, do not change its existing behavior. If you fold it into
  reactions instead, document that explicitly as an amendment.
- Coordinate with issue #11 (Read-later / bookmark list) before starting —
  both add a new per-user/per-article join table adjacent to `Favorites`;
  avoid picking both at once unless you plan to rebase carefully.

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries (noting explicitly whether/how
      this amends `REQ-025`/`REQ-026`)
- [ ] PR opened per `GITHUB.md`

---

## Issue 15 — In-app notifications center

**Size:** L · **Area:** Full-stack

### Summary

Notify a user, within the app, when someone follows them, comments on
their article, or favorites their article.

### User story

As a user, I want to see notifications for new followers, comments, and
favorites on my content, so that I know when someone has engaged with
me without having to check manually.

### Acceptance criteria

- A notification is generated when another user follows the current
  user, comments on one of the current user's articles, or favorites
  one of the current user's articles.
- A user can view a list of their own notifications, newest first.
- A notification indicates its type and enough context to identify what
  it refers to (who, and which article/comment if applicable).
- A user can mark notifications as read (individually or in bulk); the
  unread state is visible at a glance (e.g. a badge/count).
- A user does not receive a notification for their own actions on their
  own content (e.g. favoriting your own article, if that's even
  possible, shouldn't notify you).
- Notifications are private to the recipient — one user cannot view
  another's notification list.

### Constraints

- Do not change the underlying follow/comment/favorite behaviors
  themselves (`REQ-022`–`REQ-028`) — notifications are a side effect,
  not a gate.

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 16 — Auto-generated table of contents

**Size:** S/M · **Area:** Frontend

### Summary

Parse an article's Markdown body for headings and render a linked table
of contents alongside the article, letting readers jump to a section.

### User story

As a reader, I want a table of contents for long articles, so that I can
quickly jump to the section I'm interested in.

### Acceptance criteria

- On the article detail page, headings present in the article body
  produce a corresponding list of links.
- Clicking a table-of-contents entry scrolls the article to that
  heading.
- An article with no headings renders with no table of contents (no
  empty box, no error).
- The table of contents reflects the article's current body content —
  editing the article and adding/removing headings updates it
  accordingly on next view.

### Constraints

- Must not change how the article body itself is rendered from Markdown
  today (existing `markdown-to-jsx` output for non-heading content stays
  the same).

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 17 — Profile social links

**Size:** S/M · **Area:** Full-stack

### Summary

Let a user add links to external profiles (e.g. personal site, GitHub,
Twitter/X) to their account, displayed on their public profile.

### User story

As a user, I want to list links to my other online presences on my
profile, so that readers who like my writing can find me elsewhere.

### Acceptance criteria

- The account settings page lets a user set zero or more social/external
  links.
- A user's public profile displays any links they've set, each pointing
  to the URL provided.
- Links are optional — a profile with none set renders exactly as it
  does today, with no empty placeholders.
- Submitting an update with a field left blank clears that link, and
  fields not included in the submission are left unchanged — consistent
  with the existing partial-update semantics on profile updates
  (`REQ-011`).

### Constraints

- Do not change existing profile update semantics for username, email,
  bio, image, or password (`REQ-011`, `REQ-012`).

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 18 — Download article as Markdown

**Size:** S · **Area:** Frontend

### Summary

Let a reader download an article's content as a standalone `.md` file
from the article detail page.

### User story

As a reader, I want to download an article as a Markdown file, so that I
can save or read it offline in my own editor/notes app.

### Acceptance criteria

- The article detail page has a control to download the current
  article's content as a `.md` file.
- The downloaded file's content matches the article's title and body in
  a readable Markdown format.
- The downloaded filename is derived from the article in a predictable
  way (e.g. based on its slug).
- This works for any article the current viewer can already read — no
  new access is granted or required beyond viewing the article itself.

### Constraints

- No backend change is required or expected for this feature; keep it
  client-side.

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 19 — Recently viewed articles widget

**Size:** S/M · **Area:** Frontend (or full-stack, your call)

### Summary

Show a user a short list of articles they've recently opened, so they
can quickly return to something they were reading.

### User story

As a user, I want to see a list of articles I've recently viewed, so
that I can easily get back to something I was reading without searching
for it again.

### Acceptance criteria

- Opening an article's detail page records it as "recently viewed" for
  the current visitor.
- A visitor can see their own recently-viewed list somewhere in the UI,
  most recent first, capped at a defined, documented length.
- The list does not include duplicate consecutive entries for repeat
  views of the same article (viewing it again moves it to the top rather
  than adding a second entry).
- You decide, and must document, whether this is per-browser (e.g.
  local storage) or tied to the authenticated account, and whether
  anonymous visitors get this feature at all.

### Constraints

- This is purely additive and must not change the article detail page's
  existing fetch/navigation-state behavior (`REQ-043`).

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`

---

## Issue 20 — Multi-tag (AND) filtering

**Size:** M · **Area:** Full-stack

### Summary

Let article listing be filtered by more than one tag at once (an
article must carry all of the given tags), in addition to the existing
single-tag filter.

### User story

As a user, I want to filter articles by multiple tags at once, so that I
can narrow results to content matching several topics simultaneously.

### Acceptance criteria

- Article listing accepts more than one tag filter value and returns
  only articles carrying all of the specified tags.
- Providing a single tag continues to behave exactly as it does today
  (`REQ-013`).
- Providing no tag filter continues to behave exactly as it does today.
- Multi-tag filtering respects the existing pagination page size
  (`REQ-031`) and can be combined with the existing author/favorited
  filters.

### Constraints

- Must not change single-tag or no-tag filtering behavior (`REQ-013`).
- Coordinate with issue #4 (Trending / Top Articles feed tab) before
  starting — both touch the article-listing endpoint's query handling;
  avoid picking both at once unless you plan to rebase carefully.

### Definition of Done

- [ ] Feature implemented end-to-end
- [ ] Automated tests added for the new behavior
- [ ] `REQUIREMENTS.md` / `USER_STORIES.md` / `ACCEPTANCE_CRITERIA.md`
      updated with new numbered entries
- [ ] No existing `REQ-001`–`REQ-046` behavior changed
- [ ] PR opened per `GITHUB.md`
