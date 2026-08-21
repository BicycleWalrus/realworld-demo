# Conduit — Legacy Implementation

## Purpose

This repository contains a working full-stack implementation of **Conduit**, a
social blogging platform in the style of Medium, built to the
[RealWorld](https://github.com/gothinkster/realworld) specification. Users can
register an account, publish and edit articles written in Markdown, tag
articles, comment on articles, favorite articles, and follow other authors. A
personalized feed shows articles from authors a user follows, alongside a
global feed of all articles.

The system is composed of:

- A REST API (Node.js / Express / Sequelize) that persists data in a
  relational database and enforces authentication and ownership rules.
- A single-page web client (React) that consumes the API to provide the
  browsing, authoring, and social-interaction experience.

## Primary domain concepts

- **User** — an account with credentials (email/password), a public profile
  (username, bio, image), and a session token issued at login.
- **Article** — a piece of content with a title, description, and Markdown
  body, written by exactly one User (its author), and identified externally
  by a slug derived from its title.
- **Comment** — a piece of text written by a User in reply to a specific
  Article.
- **Tag** — a short label that can be attached to an Article; Articles can be
  browsed or filtered by tag.
- **Favorite** — a relationship between a User and an Article expressing that
  the User has marked the Article as a favorite; Articles carry a favorite
  count and a per-viewer favorited state.
- **Follow** — a relationship between two Users (follower and followed);
  following another user causes that user's articles to appear in the
  follower's personalized feed.

## Status of this codebase

This is an **existing legacy implementation**. The application is functional
and already in use; this documentation set (`README.md`,
[`REQUIREMENTS.md`](./REQUIREMENTS.md), [`USER_STORIES.md`](./USER_STORIES.md),
and [`ACCEPTANCE_CRITERIA.md`](./ACCEPTANCE_CRITERIA.md)) describes the
system **as it currently behaves**, reconstructed directly from its source
code and existing automated tests. It intentionally does not propose
architectural changes, refactors, or new features — including any behavior
that is arguably a defect. Where the current implementation contains a
surprising, inconsistent, or fragile behavior, that behavior is documented
as-is in `REQUIREMENTS.md`, because it is what the running system actually
does today.

## Related documents

| Document | Contents |
|---|---|
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | Numbered (`REQ-###`) statements of observable system behavior. |
| [`USER_STORIES.md`](./USER_STORIES.md) | Numbered (`US-###`) stories tracing back to one or more requirements. |
| [`ACCEPTANCE_CRITERIA.md`](./ACCEPTANCE_CRITERIA.md) | Numbered (`AC-###`) testable criteria tracing back to one or more user stories. |
