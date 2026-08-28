# Requirements

These requirements describe **observable behavior of the current
implementation**, reconstructed from `backend/`, `frontend/`, and the
existing automated tests. Each requirement states what the system does
today, including boundary conditions and special cases already present in
the code. No requirement here describes desired behavior that the current
code does not already exhibit.

---

## Authentication & Session

### REQ-001 — Optional authentication on read endpoints
Requests to endpoints that support anonymous access (article listing, single
article, article comments, user profiles, tags) are processed whether or not
an `Authorization` header is present. When absent, the request proceeds
without a resolved user.

### REQ-002 — Malformed `Authorization` header rejected
If an `Authorization` header is present but splitting its value on a space
does not yield a non-empty token as the second element — e.g., no space is
present at all, or the header ends with a space and nothing follows it —
the request is rejected with a generic server error rather than a specific
authentication error.

### REQ-003 — Authentication required for protected actions
Actions that create, modify, or delete a user's own data (viewing/updating
one's account, creating/updating/deleting an article, creating/deleting a
comment, favoriting/unfavoriting an article, following/unfollowing a user)
require a resolved, authenticated user. When no `Authorization` header was
supplied at all, these actions are rejected with an authentication-required
error.

### REQ-004 — Session tokens do not expire
A session token issued at registration or login remains valid indefinitely;
the system does not enforce any expiration on it.

### REQ-005 — Token with a valid signature but an unresolvable account
If a session token's signature verifies successfully, but no account can be
found matching the token's embedded email, the request-handling code
attempts to report a not-found condition and then, without returning, goes
on to dereference a field of the (unresolved) user object — which raises a
second, unrelated error that is also passed to the error handler. Because
two separate error-handling attempts are triggered for the same request,
the exact HTTP response the caller ultimately receives cannot be reliably
determined from the source alone; confirming it would require observing a
running server. See REQ-041 for the related but distinct case of a token
whose signature does not verify at all, which does not exhibit this
double-error behavior.

---

## Registration & Login

### REQ-006 — Registration requires username, email, and password
Account registration requires non-empty `username`, `email`, and `password`
values. If any is missing, registration is rejected with a field-required
error identifying the first missing field, checked in the order username,
email, password.

### REQ-007 — Registration enforces unique email
Registration is rejected if an account already exists with the submitted
email address. Username is not checked for uniqueness during registration.

### REQ-008 — Login requires a matching email and correct password
Login requires an account to exist with the submitted email; if none exists,
login is rejected. If an account exists but the submitted password does not
match the stored (hashed) password, login is rejected with a generic
"wrong email/password combination" error that does not distinguish which
field was incorrect.

### REQ-009 — Session token issued on successful registration or login
A successful registration or login returns the user's profile data together
with a session token to be used for subsequent authenticated requests.

---

## Account / Profile

### REQ-010 — Account viewing and updating requires authentication
Retrieving or updating the authenticated user's own account requires a
resolved, authenticated user; unauthenticated requests are rejected.

### REQ-011 — Profile update behavior
Updating a user's profile applies each submitted field (username, email,
bio, image) directly to the account, except that any field with an
`undefined` value is left unchanged.

**Special case:** the `password` field is always re-hashed and saved,
regardless of its content — including an empty string. There is no
condition under which a profile update leaves the stored password
unchanged; every account update overwrites the password hash with the hash
of whatever value was submitted in the `password` field (empty string if
none was intentionally provided).

### REQ-012 — Current-user email is sourced from the session token
When returning the authenticated user's own account data, the email address
returned is taken from the session token's contents rather than re-read from
the stored account record on that request.

---

## Articles

### REQ-013 — Article listing supports filtering and pagination
Article listing can be filtered by author username, by tag name, or by the
username of a user who has favorited the articles (mutually independent
filters). Listing supports a page size (`limit`, default 3) and a page index
(`offset`, default 0), and results are ordered newest first.

### REQ-014 — Listing favorites for a nonexistent user fails
Filtering the article list by `favorited=<username>` for a username that
does not correspond to any account results in a server error rather than an
empty list.

### REQ-015 — Article creation requires title, description, body, and a unique slug
Creating an article requires non-empty `title`, `description`, and `body`.
A URL slug is derived automatically from the title. If an article already
exists with the same derived slug, creation is rejected as a duplicate.

### REQ-016 — Only the article's author may update or delete it
Updating or deleting an article is only permitted for the account that
authored it. Any other authenticated account attempting to update or delete
the article is rejected with an authorization error.

### REQ-017 — Updating an article's title regenerates its slug without a uniqueness check
When an article update includes a new `title`, the article's slug is
regenerated from that title and saved. Unlike article creation, this update
path does not check whether the regenerated slug collides with another
existing article's slug.

**Boundary:** `description` and `body` fields on update are only applied
when truthy; a falsy value (e.g., empty string) submitted for `description`
or `body` leaves the existing value unchanged rather than clearing it.

### REQ-018 — Personalized feed is limited to followed authors
The personalized article feed (available only to authenticated users)
returns only articles authored by users the requesting user currently
follows, ordered newest first. If the user follows no one, the feed returns
no articles.

### REQ-019 — Single article retrieval by slug
An article can be retrieved individually by its slug. If no article matches
the given slug, retrieval fails with a not-found error.

---

## Tags

### REQ-020 — Tag attachment/creation rule on article creation
When creating an article with a list of tags, each tag is trimmed and
matched against existing tags by name.

- If a tag with that name already exists, it is attached to the article
  regardless of its length.
- If no tag with that name exists, a new tag is created (using the trimmed
  name) and attached **only if** the original, untrimmed tag string is
  longer than 2 characters. This means the length check counts any
  surrounding whitespace in the submitted tag even though that whitespace
  is stripped before the tag is stored — e.g., a submitted tag of `"  ab"`
  (4 characters including leading whitespace, but `"ab"` after trimming)
  passes the length check and is created, despite trimming to only 2
  characters. New tag names that fail the untrimmed length check are
  silently discarded with no error reported to the caller.

### REQ-021 — Tag listing
The full list of tags can be retrieved without authentication, and is
returned in full without pagination.

---

## Comments

### REQ-022 — Comment creation requires a non-empty body and an existing article
Creating a comment on an article requires a non-empty `body` and requires
the target article (identified by slug) to exist; otherwise the request is
rejected (field-required or not-found, respectively). The submitted body is
only checked for truthiness on the server — a body consisting solely of
whitespace is not rejected server-side.

### REQ-023 — Only the comment's author may delete it
Deleting a comment is only permitted for the account that authored it. Any
other authenticated account attempting to delete the comment is rejected
with an authorization error.

### REQ-024 — Comment listing available without authentication
Retrieving the list of comments for an article does not require
authentication.

---

## Favorites

### REQ-025 — Favoriting/unfavoriting an article requires authentication and an existing article
Favoriting or unfavoriting an article requires a resolved, authenticated
user and requires the target article to exist (identified by slug);
otherwise the request is rejected.

### REQ-026 — Favorite status and count are always represented
Any article representation returned by the API includes a favorite count
(the total number of users who have favorited it) and a favorited flag
indicating whether the requesting user has favorited it. For anonymous
requests, the favorited flag is always `false`, while the favorite count
still reflects the true total.

---

## Follows

### REQ-027 — Following/unfollowing a user requires authentication and an existing target account
Following or unfollowing another user requires a resolved, authenticated
user and requires the target account (identified by username) to exist;
otherwise the request is rejected.

### REQ-028 — Follow status and follower count are always represented
Any user/profile representation returned by the API (standalone profile, or
an article/comment's author) includes a follower count and a following flag
indicating whether the requesting user currently follows that account. For
anonymous requests, the following flag is always `false`, while the
follower count still reflects the true total.

---

## Client Session & Feed Behavior

### REQ-029 — Session persists across page loads
Once a user logs in or registers, their session (credentials header and
profile data) is retained in the browser between page loads/refreshes, so
the user remains signed in without re-entering credentials.

### REQ-030 — Default feed tab selection
On the home page, the initially selected feed tab is "Your Feed" if the
visitor is authenticated, or "Global Feed" if not. The selected tab updates
automatically if the visitor's authentication state changes.

**Boundary:** if the "Your Feed" tab is active while there is no
authenticated session, the article list for that tab is never fetched and
the view remains in a perpetual loading state rather than showing an empty
list or an error.

### REQ-031 — Article list page size
Article listings displayed to the user (home feed, profile articles,
profile favorites) are paginated at 3 articles per page.

### REQ-032 — Popular tags display is limited to 50
The popular-tags sidebar displays at most the first 50 tags returned by the
tag listing, even if more are available.

### REQ-033 — Default avatar for users without a profile image
Any user avatar rendered in the client falls back to a bundled placeholder
image when the user has no profile image set.

### REQ-034 — Client prevents submission of whitespace-only comments
The comment submission form does not send a comment whose text consists
entirely of whitespace; submission is silently skipped in that case.

### REQ-035 — Non-owner is redirected away from the article editor
When a user opens the article editor for an existing article that they are
not the author of, they are redirected away from the editor without seeing
the edit form.

### REQ-036 — Unauthenticated visitor is redirected away from account settings
A visitor without an active session who navigates to the account settings
page is redirected away from that page.

---

## Error Handling

### REQ-037 — Server maps recognized error categories to specific HTTP status codes
The API responds with a specific HTTP status code for each recognized error
category: authentication-required errors as 401, authorization/ownership
errors as 403, not-found errors as 404, and validation errors (including
missing required fields and duplicate values) as 422. Any other error
condition — including malformed input that is not explicitly validated —
results in a 500 response.

### REQ-038 — Client surfaces error messages only for specific response statuses
When an API request fails with an HTTP response status of 401, 403, 404,
422, or 500, the client extracts and surfaces the server's error message to
the calling code. For any other response status, or for a failure with no
HTTP response at all (e.g., a network failure), the error is logged but not
surfaced to the calling code as a thrown error.

*(Directly verified by `frontend/src/helpers/errorHandler.test.js`, which
asserts that the handler throws for each of statuses 401, 403, 404, 422, and
500.)*

---

## Content Formatting

### REQ-039 — Slug normalization
A slug generated from an arbitrary input string is trimmed of leading and
trailing whitespace, converted to lowercase, and has every run of
non-word characters or underscores replaced with a hyphen.

*(Directly verified by `backend/helper/helpers.test.js`, which asserts that
several variations of `"Hello World"` — differing in case, surrounding
whitespace, and underscore-vs-hyphen separators — all normalize to
`"hello-world"`.)*

### REQ-040 — Article/comment date display format
Any displayed creation date (article, comment) is formatted as a full month
name, numeric day, and numeric year (e.g., "January 1, 2020").

*(Directly verified by `frontend/src/helpers/dateFormatter.test.js`.)*

---

## Amendments

The following requirements were added after a documentation review found
special cases present in the code but not yet captured above. Numbering is
appended rather than interleaved so that the original REQ-001–REQ-040
numbering is preserved unchanged.

### REQ-041 — Session token with an invalid or unverifiable signature
If a session token's signature cannot be verified (e.g., it was altered, or
was signed with a different key than the server currently uses), the
request is rejected with a single, generic server error. Unlike REQ-005,
this path does not exhibit double error-handling — the failure is caught
once and reported once.

### REQ-042 — Comment-delete confirmation is not conditioned on authentication state
When an unauthenticated visitor clicks the delete control on a comment, the
client shows a login-required alert but does not stop there: a
delete-confirmation dialog is still presented immediately afterward, and if
confirmed, a delete request is still sent to the server. This differs from
the equivalent article-delete control, which stops immediately after
showing its login-required alert and never presents a confirmation dialog
or sends a request. In both cases the server independently rejects an
unauthenticated delete request (REQ-003), so the comment is not actually
deleted either way — only the client-side dialog sequencing differs.

### REQ-043 — Article detail view can display data without refetching from the server
When the article detail page is opened by following an in-app link from an
article list or preview (which supplies the article's data via client-side
navigation state), the page renders that supplied data directly and does
not request the article from the server again for that page view. If the
page is instead opened without such navigation state (e.g., a direct URL
visit or a page reload), it always requests the article from the server. A
narrower version of the same pattern applies to the profile page's author
information, which refetches from the server unless the supplied
navigation state's `bio` value already matches what is displayed.

### REQ-044 — Article editor's ownership check can be bypassed by navigation state
The client-side check that redirects a non-author away from the article
editor (REQ-035) only runs when the editor is opened without pre-supplied
navigation state; when navigation state is present, the client does not
re-fetch the article or re-check authorship before displaying the edit
form. In the application's own navigation flows, state is only ever
supplied by a control that is itself only shown to an article's actual
author, so this path is not reachable by a non-author through normal use of
the application. Regardless of how the editor is reached, the server-side
authorship check (REQ-016) is independent of this client-side check and
still rejects an update submitted by a non-author.

### REQ-045 — Client-side password length validation differs between login and registration
The login form enforces a minimum password length of 5 characters before
allowing submission; the registration form enforces no minimum length on
its password field. Neither the login nor the registration server endpoint
enforces any password length requirement — both only reject an entirely
empty password (REQ-006, REQ-008).

### REQ-046 — Frontend development server binds to all interfaces on port 2224
When started via `npm run dev`, the frontend's Vite development server
listens on port `2224` and binds to all network interfaces (`0.0.0.0`),
rather than its previous configuration (port `3000`, bound to `localhost`
only) — making the dev server reachable from other devices on the local
network. This requirement covers only the development server started via
`npm run dev`; it does not alter the production build/serve path, and the
backend Express server's own listening port and bind address are
unchanged.

---

### REQ-047 — Dedicated read-only Postgres role for MCP diagnostic access
A Postgres role named `mcp_readonly` exists in the local development
database (the `postgres` service in `docker-compose.yml`), provisioned
idempotently via `db/init/01-mcp-readonly-role.sql` — automatically on a
fresh volume (mounted as a `docker-entrypoint-initdb.d` script), or via
`npm run db:mcp-role` against a pre-existing volume. The role is granted
`CONNECT` on the `realworld` database, `USAGE` on the `public` schema, and
`SELECT` only on all tables in that schema — via both a direct grant and
`ALTER DEFAULT PRIVILEGES`, so tables added by future migrations are
covered automatically — with `default_transaction_read_only` set to `on`
for the role. No `INSERT`/`UPDATE`/`DELETE`/DDL privilege is granted, and
the role has no superuser attribute. This requirement does not alter the
existing application role's (`POSTGRES_USER`) privileges, and applies only
to local development — no production database is reachable from this
role.

### REQ-048 — MCP server for read-only local Postgres access
The repository's checked-in `.mcp.json` configures a Postgres MCP server
(`postgres-readonly`) that connects using the `mcp_readonly` role
(REQ-047), with the connection string supplied only via the
`MCP_PG_READONLY_URL` environment variable — no literal credential is
committed to `.mcp.json` or any other tracked file. The server package
(`@ahmetkca/mcp-server-postgres`) is pinned to an exact version in
`package.json`, with its integrity hash captured in `package-lock.json`,
rather than resolved as "latest" at each session start. The server's
tools are not added to any auto-approval allowlist in
`.claude/settings.json`, so the first use of the server in a session
requires the normal Claude Code permission prompt rather than running
unattended.

---

### REQ-049 — Navbar theme toggle available on every page, for all auth states
A control in the navbar lets a visitor switch between a light and a dark
theme. The control is rendered for every page reachable through the
navbar, regardless of whether the visitor is authenticated — it is not
conditioned on the same authentication check that shows or hides the
"New Article"/account controls versus the "Login"/"Sign up" controls.

### REQ-050 — Chosen theme persists across reloads and visits
Once a visitor selects a theme via the navbar toggle, that choice is saved
in the browser (`localStorage`) and is reapplied on subsequent page loads
and visits, without requiring the visitor to reselect it.

### REQ-051 — First-visit theme defaults to OS preference, else light
On a first visit with no previously saved theme choice, the application
selects the dark theme if the browser reports an operating-system
preference for dark color schemes (`prefers-color-scheme: dark`);
otherwise it selects the light theme. This OS-preference check is only
consulted when no theme choice has been saved yet — once a choice exists
(REQ-050), it takes precedence over the OS preference on later visits.

### REQ-052 — Theme switch applies instantly with unchanged light rendering
Selecting a theme via the navbar toggle takes effect immediately, without
a page reload. When the dark theme is not selected (the OS-preference
default resolves to light, or the visitor has explicitly chosen light),
the rendered appearance is unchanged from the application's existing
(pre-dark-theme) light appearance.

---

### REQ-053 — Profile shows the author's published article count
An author's profile page (`/profile/:username`) shows the total number of
articles that author has published.

### REQ-054 — Profile shows total favorites summed across the author's articles
An author's profile page shows the total number of favorites received
across all of that author's articles, summed.

### REQ-055 — Profile shows member-since date without widening the user payload
An author's profile page shows the date the author's account was created
("member since"), formatted the same way as other dates in the
application (REQ-040). This date is exposed via a purpose-built field
rather than by widening `User.toJSON()` — the existing exclusion of
`createdAt` from a serialized `User` (used elsewhere in the application)
is unchanged.

### REQ-056 — Profile stats are visible to all visitors and correct on load
The article count, summed favorites, and member-since date (REQ-053,
REQ-054, REQ-055) are visible to both authenticated and anonymous
visitors of a profile page, identically, and are correct as of the
current data when the profile page loads — including when the page is
reached via a link that supplies partial profile data that does not
already include these stats.

---

### REQ-057 — Article search by keyword
A search input lets a visitor enter a keyword and view the articles that
match it. On the frontend, submitting a keyword sets an independent
"search" feed tab (distinct from the Global Feed, an author's articles,
a tag, or favorites) that carries the submitted term, and a pill in the
feed area shows the active search term while that tab is selected.

### REQ-058 — Search matches title, description, or body, case-insensitively
A search keyword matches an article if it is a case-insensitive substring
of that article's title, description, or body (matching any one of the
three is sufficient). The backend `allArticles` listing accepts a
`search` query parameter and, when it is a non-blank string, restricts
results to matches on at least one of those three fields.

### REQ-059 — Search results are paginated like any other listing
Search results are paginated the same way as the rest of the article
listing (REQ-013): a page size of 3 by default, newest first, with the
reported total reflecting every match rather than only the current page.

### REQ-060 — Empty search falls back to the full listing; backend search composes with other filters
A missing, empty, or whitespace-only `search` value does not filter the
listing and does not error — the full listing (or the result of any other
filters present) is returned, exactly as if `search` had not been
supplied. On the frontend, submitting a blank/whitespace search term
falls back to the Global Feed rather than an empty search tab. On the
backend, `search` is additive: when combined with the existing
author/tag/favorited filters (REQ-013), a request is restricted by all of
the supplied filters together (a logical AND), not by `search` alone.

---

### REQ-061 — Top Articles feed tab available to any visitor
A "Top Articles" feed tab is available next to the existing tabs (Your
Feed, Global Feed) and is selectable by any visitor, whether or not they
are logged in. It is selected via a `sort=top` query parameter on the
existing `GET /api/articles` listing (REQ-013) rather than a separate
route.

### REQ-062 — Top Articles ordered by favorite count, ties broken by newest
When the Top Articles tab is selected, the listing is ordered by each
article's favorite count, highest first. Articles with equal favorite
counts are ordered relative to each other newest-first (by `createdAt`).

### REQ-063 — Top Articles paginated like any other listing
The Top Articles listing is paginated the same way as the rest of the
article listing (REQ-013): a page size of 3 by default, with the reported
total reflecting every matching article rather than only the current
page.

### REQ-064 — Switching feed tabs re-fetches so no stale data is shown
Switching to or away from the Top Articles tab re-fetches the article
listing, so an article list from a previously selected tab is never left
displayed under a different, newly selected tab.

---

### REQ-065 — Only the comment's author may edit its body
Editing an existing comment's body, via `PUT
/api/articles/:slug/comments/:commentId`, is only permitted for the
account that authored it. Any other authenticated account attempting to
edit the comment is rejected with an authorization error (mirroring the
comment-delete ownership rule, REQ-023). An unauthenticated visitor cannot
edit a comment; the request is rejected with an authentication-required
error (mirroring REQ-003).

### REQ-066 — Comment editing requires a non-empty body
Editing a comment requires a non-empty `body`, checked the same way as
comment creation (REQ-022): the submitted body is only checked for
truthiness on the server, so a body consisting solely of whitespace is
not rejected server-side.

### REQ-067 — Edited comment body is persisted and shown on subsequent loads
After a comment edit succeeds, the updated body is saved and is what is
returned and displayed the next time the article's comments are loaded —
not only reflected transiently in the client that made the edit.

### REQ-068 — The edit control is shown only to the comment's author
The client only renders a control for editing a comment's body to the
account that authored that comment. Any other authenticated visitor, or
an anonymous visitor, does not see the control (mirroring the existing
comment-delete control's ownership check).

---

### REQ-069 — Article draft state / draft save
*(Amends REQ-015.)* An article carries a `published` flag. An author may
save a new or edited article as an unpublished draft (`published: false`)
instead of publishing it, rather than every created article being
immediately public. For backward compatibility, when the flag is omitted
on creation the article is published (`published: true`), so REQ-015's
creation behavior is otherwise unchanged.

### REQ-070 — Draft visibility exclusion
*(Amends REQ-013 and REQ-018.)* An unpublished draft article is excluded
from the global feed, the personalized feed (REQ-018), tag filtering,
keyword search (REQ-057), the Top Articles listing (REQ-061), and other
users' profile listings (REQ-013) — for everyone except the article's
author.

### REQ-071 — Author draft access
An author sees their own draft articles in their own profile's "My
Articles" listing and can continue editing them.

### REQ-072 — Publishing a draft
An author can publish a draft by setting `published: true` on an article
update, after which it appears in listings the same as any other
published article.

### REQ-073 — Draft direct-access protection
*(Amends REQ-019.)* Retrieving a draft article by slug fails with a
not-found error for anyone who is not its author, including an anonymous
visitor. Only the article's author can retrieve their own unpublished
draft by slug.

---

### REQ-074 — Paginated user directory
A user directory lists user profiles (username, avatar, bio) via `GET
/api/profiles`, using a bounded page size rather than one unbounded query
or render: results are limited and offset via `limit`/`offset` query
parameters (defaulting to a page size of 10), ordered by username.

### REQ-075 — User directory readable without authentication
The user directory endpoint is readable without authentication,
consistent with REQ-001's pattern for read endpoints: an anonymous
request receives the same paginated listing as an authenticated one.

### REQ-076 — Directory entries link to full profiles
Each entry in the user directory links to that user's full profile page
at `/profile/:username`.

---

### REQ-077 — Optional article cover image URL
An article may carry an optional cover image URL. The article editor
accepts an `image` value on both creation and update; the field is
optional and its presence or absence does not affect the required
title/description/body validation of article creation (REQ-015). Omitting
`image` on creation leaves it unset; omitting it on update leaves the
article's existing value unchanged.

### REQ-078 — Cover image display, or unchanged layout when absent
When an article has a cover image, it is displayed on that article's
preview card and on its detail page. When an article has no cover image,
those layouts render exactly as they did before this requirement — no
placeholder element and no layout shift. An invalid or unreachable image
URL results, at most, in a broken image element; it does not prevent
article creation, update, or rendering from succeeding.

---

### REQ-079 — Comment @mention autocomplete
While composing a comment, typing `@` followed by one or more characters
offers matching existing-username suggestions — matched by case-insensitive
username prefix — that can be selected to complete the mention. MVP scope:
suggestions are offered only for the mention token currently being typed at
the end of the textarea's value; a partial mention elsewhere in the body is
not offered suggestions.

### REQ-080 — Valid @mentions render as profile links
In a rendered comment body, an `@username` token that corresponds to an
existing user is displayed as a link to that user's profile at
`/profile/:username`. This resolution happens at render time (when
comments are listed), so it applies to both newly created comments and
comments that already existed before this requirement.

### REQ-081 — Unmatched @mentions render as plain text
An `@something` token in a rendered comment body that matches no existing
username is displayed as plain text, not a link. Mention resolution does
not alter the stored comment body or its REQ-022 validation.

### REQ-082 — Reply to a top-level comment
A top-level comment offers a Reply control under the same authentication
rule as posting a top-level comment (REQ-003). Submitting a reply creates
a new comment with a `parentId` referencing that top-level comment. Only
one level of nesting is supported: a comment that already has a
`parentId` (i.e. is itself a reply) cannot be targeted as the parent of
another reply, and such a request is rejected.

### REQ-083 — Replies listed nested under their parent
Retrieving an article's comments (REQ-024) returns top-level comments
(comments with no `parentId`), each carrying a nested `replies` list of
the comments created against it. Replies receive the same author-follower
and @mention (REQ-080/REQ-081) enrichment as top-level comments.

### REQ-084 — Cascade delete of replies
Deleting a comment (REQ-023) also deletes any replies associated with it,
via the parent comment's foreign key. Deleting a comment continues to
require that the requester is that comment's author, per REQ-023 — this
requirement does not change who may delete a comment, only what else is
removed as a consequence.

### REQ-085 — Flat top-level comment behavior unchanged
For a comment with no `parentId`, comment creation, listing, and deletion
behave exactly as documented before REQ-082–REQ-084: this feature is
additive and does not alter existing top-level comment behavior.

---

## Read Later

### REQ-086 — Adding/removing an article to/from a private read-later list requires authentication
An authenticated user can add or remove an article to/from a personal,
private read-later list via `POST`/`DELETE /api/read-later/:slug`. This
list is backed by a join table distinct from Favorites (REQ-025/REQ-026)
and does not affect the article's public favorite count. Saving or
unsaving an article requires a resolved, authenticated user, mirroring
REQ-025's authentication rule for favoriting.

### REQ-087 — Retrieving the read-later list
`GET /api/read-later` returns the current authenticated user's saved
articles, ordered most-recently-added first, using a bounded page size via
`limit`/`offset` query parameters (defaulting to a page size of 3,
consistent with REQ-013's article-listing pagination default).

### REQ-088 — The read-later list is private and Favorites-independent
The read-later list reflects only the requesting user's own saves: it is
derived from the authenticated requester and is not exposed to other
users. Adding or removing an article from the read-later list leaves
Favorites (REQ-025/REQ-026) and the article's public favorite count
unchanged.

---

## Follow Tags

### REQ-089 — Following/unfollowing a tag requires authentication and an existing tag
An authenticated user can follow or unfollow a tag via `POST`/`DELETE
/api/tags/:name/follow`. The target tag must already exist, identified by
name; otherwise the request fails with a not-found error. Following or
unfollowing a tag requires a resolved, authenticated user, mirroring
REQ-027's authentication rule for following a user. This is backed by a
`TagFollows` join table, distinct from the article tag list join table
(REQ-020/REQ-021): following a tag never creates, attaches, or removes it
from any article.

### REQ-090 — Personalized feed includes articles by followed authors or with followed tags (amends REQ-018)
REQ-018 stated that the personalized feed returns only articles authored
by users the requesting user follows. This is amended: the feed now
returns published articles that are authored by a user the requesting
user follows, or that carry a tag the requesting user follows, or both —
a union of the two conditions rather than followed authors alone. Results
remain ordered newest first.

### REQ-091 — Personalized feed is empty only when following no author and no tag (amends REQ-018)
REQ-018 stated that the feed returns no articles if the user follows no
one. This is amended by REQ-090's union rule: the feed is empty only when
the requesting user follows neither any author nor any tag. A user who
follows at least one tag, even with no followed authors, receives any
matching articles in their feed.

---

## Reading Time

### REQ-092 — Article preview cards and the article detail page display an estimated reading time
Both an article preview card and the article detail page display an
estimated reading time derived from the article's body, at approximately
200 words per minute, rendered as "N min read". This is shown alongside
the existing date (REQ-040) without altering the date's formatting or
rendering. Because the estimate is derived from the current body, it
reflects edits made to the body.

### REQ-093 — The reading-time estimate has a floor of one minute and is well-defined for any body
The reading-time estimate is never less than "1 min read", including for
an empty, whitespace-only, or missing body. The estimate is also
well-defined for a very long body. The estimate never renders as `NaN`
and never involves a division-by-zero.

---

## Reactions

### REQ-094 — An authenticated user can set, change, or remove a reaction from a fixed set (mirrors REQ-025's authentication rule)
An authenticated user can react to an existing article with exactly one
type from the fixed set `like`, `insightful`, `celebrate`, via `POST
/api/articles/:slug/reactions` with the desired type. A user has at most
one reaction on a given article: reacting again with a different type
changes the existing reaction rather than adding a second one. A user can
explicitly remove their reaction via `DELETE
/api/articles/:slug/reactions`. An unknown reaction type is rejected.
Reacting requires a resolved, authenticated user, mirroring REQ-025's
authentication rule for favoriting.

### REQ-095 — An article's representation includes per-type reaction counts and the viewer's own reaction
Any article representation returned by the API includes a count of
reactions of each fixed type, visible to anonymous and authenticated
visitors alike. An authenticated viewer's representation additionally
includes their own current reaction on that article, or `null` if they
have not reacted; for an anonymous request, this is always `null`.

### REQ-096 — Reactions are a separate, independent concept from Favorites
Reactions are backed by a distinct model and table from Favorites, joined
the same way (per-user, per-article) but never combined with it. Setting,
changing, or removing a reaction never creates, removes, or otherwise
affects a Favorites relation, and never changes the article's favorite
count (REQ-025/REQ-026); those remain governed entirely by REQ-025 and
REQ-026, unamended by this feature.

---

## Notifications

### REQ-097 — A notification is a side effect of a follow, a comment, or a favorite, and never gates that action
When another user follows the current user, comments (top-level or reply)
on one of the current user's articles, or favorites one of the current
user's articles, a notification is generated for the current user. This
is strictly additive: creating a notification never blocks, delays, or
otherwise changes the outcome of the underlying follow, comment, or
favorite action (REQ-022–028 remain unchanged, unamended by this
feature). No notification is created when the acting user and the
recipient are the same user. Unfollowing, unfavoriting, or deleting a
comment does not retract a notification already created by the
corresponding follow, favorite, or comment.

### REQ-098 — A user can retrieve their own notifications, newest first, with identifying context
An authenticated user can retrieve their own notifications. Each
notification carries its type (`follow`, `comment`, or `favorite`), the
actor who triggered it, and, where applicable, the article and/or comment
involved, so the notification is identifiable without a further lookup.
Notifications are returned newest first.

### REQ-099 — A user can mark notifications read, individually or all at once, and see an unread count
An authenticated user can mark a single notification read by id, or mark
all of their notifications read at once. The count of the user's unread
notifications is available so a client can render an at-a-glance badge.

### REQ-100 — Notifications are private to their recipient
Retrieving notifications and marking them read are both scoped to the
requesting user: a user can only ever see or mark read their own
notifications, never another user's.

---

## Article Table of Contents

### REQ-101 — The article detail page renders a table of contents derived from the body's headings, and activating an entry scrolls to it
On the article detail page, each ATX-style Markdown heading (`#` through
`######`) in the article body produces a corresponding entry in a
rendered table of contents, in document order. Each rendered heading also
carries an id derived (slugified) from its own text, and activating a
table-of-contents entry scrolls the article to the heading with the
matching id. The table of contents is derived from the current body on
each render, so it reflects the body as currently loaded.

### REQ-102 — No headings means no table of contents, and non-heading content rendering is unaffected
An article body containing no headings renders with no table-of-contents
element at all — not an empty container and not an error. Tagging
rendered headings with an id does not change how any non-heading
Markdown content (paragraphs, lists, links, images, code, etc.) is
rendered.

---

## Profile Social Links

### REQ-103 — A user account may carry optional external/social links
A user account may carry three optional external/social links: website,
github, and twitter. These are set through the same account-update
mechanism as username, email, bio, and image, and are therefore governed
by the same partial-update semantics as REQ-011: a link field submitted
with a blank value clears that link, and a link field not submitted is
left unchanged. This does not change the update behavior of username,
email, bio, image, or password described in REQ-011 or REQ-012.

### REQ-104 — A user's public profile displays whichever social links are set
A user's public profile displays a link for each of website, github, and
twitter that is currently set on that account, each pointing to the
provided URL. A profile with none of these links set renders with no
links section and no placeholder in its place.

---

## Article Download

### REQ-105 — The article detail page can download the article as Markdown
The article detail page provides a control that downloads the currently
displayed article as a standalone `.md` file. The file's content is the
article's title rendered as a Markdown H1, followed by its body. The file
is generated entirely client-side; no backend endpoint or service call is
involved in producing it.

### REQ-106 — The downloaded filename is derived from the article's slug, and the control requires no additional access
The downloaded file's name is derived from the article's slug as
`<slug>.md`. The control is available to any viewer who can already read
the article - authenticated or anonymous, author or not - and neither
grants nor requires any access beyond what viewing the article already
allows.
