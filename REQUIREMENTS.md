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

### REQ-049 — Dark theme toggle with persisted, OS-aware default
A control in the navbar, visible on every page regardless of
authentication state, switches the application's color theme between
light and dark without a page reload. The chosen theme is persisted (via
`localStorage`) and re-applied on subsequent page loads and new visits in
the same browser. When no theme has previously been chosen in that
browser, the application defaults to dark if the browser reports a
`prefers-color-scheme: dark` preference, and to light otherwise (including
when the preference cannot be determined). The light theme's appearance is
unchanged from before this control existed; dark-theme styling is applied
only when the dark theme is active.

### REQ-050 — Optional article cover image
An article may optionally have a cover image, specified as a URL,
mirroring how `User` already has an `image` field. This field is accepted
but not required on article creation or update; article creation's
required-field validation (title, description, body — REQ-015) is
unaffected by its presence or absence. On update, it follows the same
truthy-only boundary as `description`/`body` (REQ-017): a falsy submitted
value leaves the existing stored image unchanged, while a truthy value
replaces it. When an article has a cover image set, it is displayed on
its preview card and on its detail page; when unset, no image element is
rendered and the layout is unaffected.

### REQ-051 — Estimated reading time badge
An estimated reading time is shown alongside an article's date, on both
preview cards and the article detail page, derived from the article's
body word count at a fixed reading speed of 200 words per minute, rounded
up to the next whole minute. The displayed estimate has a minimum of "1
min read", including for empty, very short, or missing bodies — it never
displays a value below one minute, and never displays `NaN` or throws
regardless of body length. The existing date's own display and format
(REQ-040) are unaffected; the reading-time estimate is a separate element
shown alongside it, not a replacement.

### REQ-052 — Client-side Markdown download of an article
The article detail page provides a control that downloads the currently
displayed article's content as a standalone `.md` file, generated
entirely client-side from data already loaded on the page — no
additional server request is made. The file's content is the article's
title rendered as a level-1 Markdown heading, followed by its body; its
filename is derived from the article's slug (`<slug>.md`). The control is
available to any viewer who can already view the article, independent of
authentication state or authorship.

### REQ-053 — Comment editing
The author of a comment may edit its text after posting. Only the
comment's author may edit it — any other authenticated account attempting
to edit is rejected with an authorization error, mirroring the existing
deletion ownership rule (REQ-023); an unauthenticated request is rejected
with an authentication-required error, mirroring REQ-003. Editing
requires a non-empty body, the same validation applied on comment
creation (REQ-022). A successful edit is persisted and reflected in
subsequent requests, not only in the current session's local state.
Comment creation (REQ-022) and deletion (REQ-023, REQ-042) are
unaffected.

### REQ-054 — Auto-generated table of contents for article headings
The article detail page derives a table of contents from the headings
present in the article's body, rendering a linked entry for each one in
document order. Clicking an entry scrolls the page to that heading rather
than navigating. An article body with no headings produces no table of
contents (no empty container, no error). The table of contents reflects
whatever headings are currently in the body — editing the article and
changing its headings changes the table of contents accordingly the next
time it is viewed. This feature does not change how the article body itself is rendered
from Markdown.

### REQ-055 — Optional profile social links
A user account may optionally have `website`, `github`, and `twitter`
fields, each a link to an external profile. These fields go through the
same generic profile-update path as existing fields (REQ-011): a field
submitted as an empty string clears the previously stored value, and a
field omitted from the submission is left unchanged. A non-empty
submitted value must have an `http://` or `https://` scheme; a value
with any other scheme is rejected and the update does not proceed (the
platform does not otherwise verify that a link is reachable). On the
public profile page, each set link is rendered pointing to its stored
value; a profile with none set renders with no social-links section (no
empty placeholders). This is purely additive: existing profile fields
(username, email, bio, image, password — REQ-011, REQ-012) are
unaffected.

**Boundary:** article and comment payloads embed a snapshot of the
author's profile, used by the existing navigation-state shortcut
(REQ-043) to skip a profile refetch when the snapshot's `bio` still
matches. That freshness check compares only `bio`, so a change to only a
user's social links (bio unchanged) is not detected as stale by it — a
visitor already holding an older snapshot may continue to see the
pre-change links until an unrelated bio change, or a page load without
navigation state, triggers a real refetch.

### REQ-056 — Author profile stats
A profile page (`/profile/:username`) displays three additional stats
for that author: the total number of articles they have published, the
total favorite count summed across all of those articles, and a
member-since date derived from their account's creation date. These
stats are computed on each profile load (not cached or live-updating
within an open page) and are visible to both anonymous and authenticated
visitors. The member-since date is exposed only as part of this profile
response, via a dedicated field separate from `createdAt` —
`User.toJSON()`'s existing stripping of `createdAt` on other responses is
unaffected. Existing "My Articles"/"Favorited Articles" tab behavior on
the profile page is unchanged.

**Boundary:** the profile page's existing navigation-state shortcut
(REQ-043) still skips a refetch exactly when its own bio-comparison
condition is met; because navigation state never carries these new stats
fields, a profile reached via that shortcut performs one additional,
independent fetch to populate them, without altering the shortcut's own
bio-based condition.

### REQ-057 — @mentions in comments
Typing `@username` in a comment (on creation or edit) offers
matching-username suggestions as the user types, sourced from a
case-insensitive username prefix search capped at 5 results. Once posted
(or edited), any `@word` in a comment's body that exactly matches an
existing username (case-insensitive) is rendered as a link to that
user's profile, using the username's canonically stored casing; a
`@word` that matches no existing user is rendered as plain text. This
resolution happens at render time against whichever comments are
currently loaded, not stored at comment-creation time, so it applies
retroactively to comments that existed before this feature. Comment body
validation (REQ-022) is unaffected — mentions are a display/UX layer
over the existing free-text body.

### REQ-058 — Recently viewed articles widget
Opening an article's detail page records it, in the visitor's browser
(via `localStorage`, available to both authenticated and anonymous
visitors), as their most recently viewed article. The recorded list
holds at most 5 entries, most-recently-viewed first; viewing an
already-recorded article again moves it to the front rather than adding
a duplicate entry. This list is displayed in the home page's sidebar,
below Popular Tags, linking to each article by its current slug. The
article's title is recorded at view time and is not refreshed if the
article is later renamed; the link itself always points to the correct,
current article regardless. This feature is purely additive and does
not change the article detail page's existing fetch/navigation-state
behavior (REQ-043).

### REQ-059 — Browsable, paginated user directory
A page lists all user accounts (username, avatar, bio snippet),
reachable without authentication, backed by a paginated endpoint
(`GET /api/users/directory`) that returns only username/image/bio for a
bounded page of users at a time — never the whole user table in one
response. The page size defaults to 20 and is capped at 100 regardless
of what is requested; an invalid (missing, non-numeric, or negative)
limit or offset falls back to the default rather than an unbounded or
malformed query. Each entry links to that user's full profile. This is a
distinct endpoint from the existing username-search endpoints built for
@mention autocomplete (REQ-057) — it is not a repurposing of them.

### REQ-060 — Trending / Top Articles feed tab
A "Top Articles" feed tab is available alongside "Your Feed"/"Global
Feed" and "Tag", selectable by any visitor regardless of authentication.
Selecting it lists articles ordered by favorite count, highest first,
with ties broken by newest first; the favorite count for this ordering
is computed via a single aggregate query over the matching set, not one
query per article. This sort composes with the existing author/tag/
favorited filters (REQ-013) rather than being ignored when any of them
are present, and uses the same pagination page size as other listings
(REQ-031). Switching to or from this tab behaves the same as switching
between the existing tabs (no stale cross-tab data). The default tab
selection logic for "Your Feed"/"Global Feed" (REQ-030) is unaffected.

### REQ-061 — Private read-later / bookmark list
An authenticated user can save or unsave an article to a personal "read
later" list, distinct from favoriting (REQ-025/REQ-026) — a separate
table, unaffected by and not affecting the Favorites table or its
counts. A dedicated page lists the current user's own saved articles,
most-recently-saved first; the list and the save/unsave actions are
private, never visible to or actionable by any other user, and require
authentication (unauthenticated attempts are rejected the same way
favoriting is). The saved-article listing and the save-button's
displayed state both reflect the article's actual current saved state —
not just a locally-remembered value from the current session.

### REQ-062 — Article keyword search
The article listing supports an optional keyword search: only articles
whose title, description, or body contains the keyword are returned,
matched case-insensitively as substrings. The keyword composes with
(ANDs into) the existing author/tag/favorited filters (REQ-013) rather
than replacing any of them — the same mutual-composition rule those
filters already follow — and also narrows the trending sort. Search
results use the standard listing behavior unchanged: newest-first order,
the default page size (REQ-031), and a total count reflecting every
match. An empty or whitespace-only keyword applies no filter and returns
the unfiltered listing for the active view. In the web client a search
input sits above the feed on the home page; the keyword stays applied
while switching feed views and persists across pagination.
