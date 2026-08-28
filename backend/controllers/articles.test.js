const {
  AlreadyTakenError,
  ForbiddenError,
  FieldRequiredError,
  NotFoundError,
  UnauthorizedError,
} = require("../helper/customErrors");
const { Op } = require("sequelize");
const { makeInstance, toPlainJSON, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn(), findAndCountAll: vi.fn(), findAll: vi.fn(), create: vi.fn() };
const Tag = { findByPk: vi.fn(), create: vi.fn() };
const User = { findOne: vi.fn() };
const Favorites = { findAll: vi.fn() };
const TagList = { findAll: vi.fn() };
const sequelize = {
  models: { Favorites, TagList },
  fn: (fnName, col) => ({ fnName, col }),
  col: (name) => ({ col: name }),
  where: (left, op, value) => ({ left, op, value }),
};
mockRequire(require.resolve("../models"), { Article, Tag, User, sequelize });

const {
  allArticles,
  createArticle,
  singleArticle,
  updateArticle,
  deleteArticle,
  articlesFeed,
} = require("./articles");

function makeFollowableUser(overrides = {}) {
  return makeInstance(
    { id: 1, username: "author", ...overrides },
    { hasFollower: vi.fn().mockResolvedValue(false), countFollowers: vi.fn().mockResolvedValue(0) },
  );
}

// Mocks the aggregate favorite-count query the trending sort issues,
// as raw {articleId, favoritesCount} rows (favoritesCount as a string,
// matching Postgres's actual COUNT() return type via `raw: true`).
function mockFavoriteCounts(countsByArticleId) {
  Favorites.findAll.mockResolvedValue(
    Object.entries(countsByArticleId).map(([articleId, favoritesCount]) => ({
      articleId: Number(articleId),
      favoritesCount: String(favoritesCount),
    })),
  );
}

// Mocks the grouped join-table query multi-tag filtering issues, from
// [articleId, tagName] pairs: an article id is returned when it carries
// at least `having.value` of the wanted tags (the composite join-table
// primary key means one pair max per article/tag).
function mockTagIntersection(pairs) {
  TagList.findAll.mockImplementation(({ where, having }) => {
    const wanted = new Set(where.tagName[Op.in]);
    const needed = having.value;
    const countByArticleId = new Map();
    for (const [articleId, tagName] of pairs) {
      if (!wanted.has(tagName)) continue;
      countByArticleId.set(articleId, (countByArticleId.get(articleId) ?? 0) + 1);
    }
    const ids = [...countByArticleId]
      .filter(([, count]) => count >= needed)
      .map(([id]) => id);
    return Promise.resolve(ids.map((articleId) => ({ articleId })));
  });
}

function makeArticle({
  author,
  tags = [],
  hasUser = false,
  favoritesCount = 0,
  isSaved = false,
  ...data
}) {
  return makeInstance(
    {
      id: 1,
      slug: "a-slug",
      title: "A Slug",
      description: "d",
      body: "b",
      tagList: tags,
      createdAt: new Date("2020-01-01"),
      author,
      ...data,
    },
    {
      getAuthor: vi.fn().mockResolvedValue(author),
      getTagList: vi.fn().mockResolvedValue(tags),
      addTagList: vi.fn().mockResolvedValue(),
      setAuthor: vi.fn(),
      hasUser: vi.fn().mockResolvedValue(hasUser),
      countUsers: vi.fn().mockResolvedValue(favoritesCount),
      hasSavedByUser: vi.fn().mockResolvedValue(isSaved),
      save: vi.fn().mockResolvedValue(),
      destroy: vi.fn().mockResolvedValue(),
    },
  );
}

// Minimal stand-in for Sequelize's real filtering/pagination, scoped to just
// the query shapes allArticles/articlesFeed actually construct, so list
// behavior can be asserted on the returned response body rather than on
// what arguments were passed to a mock.
function fakeArticleList(seedRows) {
  return ({ include = [], limit, offset, where } = {}) => {
    let rows = [...seedRows].sort((a, b) => b.dataValues.createdAt - a.dataValues.createdAt);

    const tagFilter = include.find((i) => i.as === "tagList")?.where?.name;
    const authorFilter = include.find((i) => i.as === "author")?.where?.username;
    if (tagFilter) {
      // tagFilter is either a single tag name or an IN-list of them
      // (multi-tag filtering, REQ-063) — either way the row must carry
      // at least one of the named tags for the include to have kept it.
      const wanted = Array.isArray(tagFilter[Op.in]) ? tagFilter[Op.in] : [tagFilter];
      rows = rows.filter((r) => r.tagList.some((t) => wanted.includes(t.name)));
    }
    if (authorFilter) rows = rows.filter((r) => r.author.username === authorFilter);

    // Top-level where arrives either as a single clause or as an Op.and
    // list (REQ-062/REQ-063 compose there); interpret each uniformly.
    const whereClauses = where ? (where[Op.and] ?? [where]) : [];
    for (const clause of whereClauses) {
      if (clause?.userId) rows = rows.filter((r) => clause.userId.includes(r.author.id));

      // Keyword-search clause (REQ-062): where[Op.or] holds one
      // { field: { [Op.iLike]: "%term%" } } per searched column; a row
      // matches when any searched column contains the term, ignoring case.
      const searchClauses = clause?.[Op.or];
      if (searchClauses) {
        rows = rows.filter((r) =>
          searchClauses.some((c) => {
            const [field] = Object.keys(c);
            const term = c[field][Op.iLike].slice(1, -1).toLowerCase();
            return String(r.dataValues[field] ?? "")
              .toLowerCase()
              .includes(term);
          }),
        );
      }

      // Multi-tag id constraint (REQ-063): only rows whose id is in the
      // resolved carry-all-tags id list survive.
      const idIn = clause?.id?.[Op.in];
      if (idIn) rows = rows.filter((r) => idIn.includes(r.id));
    }

    const count = rows.length;
    rows = rows.slice(offset, offset + limit);
    return Promise.resolve({ rows, count });
  };
}

beforeEach(() => {
  Article.findOne.mockReset();
  Article.findAndCountAll.mockReset();
  Article.findAll.mockReset();
  Article.create.mockReset();
  Tag.findByPk.mockReset();
  Tag.create.mockReset();
  User.findOne.mockReset();
  Favorites.findAll.mockReset();
  TagList.findAll.mockReset();
});

describe("createArticle", () => {
  const loggedUser = makeFollowableUser();

  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await createArticle({ loggedUser: undefined, body: { article: {} } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-019: title, description, and body are all required.
  test.each([
    [{ description: "d", body: "b" }],
    [{ title: "t", body: "b" }],
    [{ title: "t", description: "d" }],
  ])("missing field in %o -> FieldRequiredError, no article created", async (article) => {
    const next = vi.fn();

    await createArticle({ loggedUser, body: { article } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(FieldRequiredError);
    expect(Article.create).not.toHaveBeenCalled();
  });

  // AC-020 / AC-062: a title whose derived slug collides with an existing
  // article is rejected.
  test("duplicate title -> AlreadyTakenError, no article created", async () => {
    Article.findOne.mockResolvedValue(makeArticle({ author: loggedUser }));
    const next = vi.fn();

    await createArticle(
      { loggedUser, body: { article: { title: "A Slug", description: "d", body: "b" } } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(AlreadyTakenError);
    expect(Article.create).not.toHaveBeenCalled();
  });

  // AC-021: an already-existing tag is attached regardless of length; a
  // brand-new tag is only created if its *untrimmed* string is longer than
  // 2 characters, even though the stored name is trimmed - so "  ab" (4
  // chars untrimmed, 2 after trimming) is created and attached, while "cd"
  // (2 chars, nothing to trim) is silently discarded.
  test("tag attach/create rules on creation", async () => {
    Article.findOne.mockResolvedValue(null);
    const created = makeArticle({ author: loggedUser });
    Article.create.mockResolvedValue(created);
    const existingTag = { name: "dragons" };
    Tag.findByPk.mockImplementation((name) => Promise.resolve(name === "dragons" ? existingTag : null));
    const newTag = { name: "ab" };
    Tag.create.mockResolvedValue(newTag);
    const res = makeRes();

    await createArticle(
      {
        loggedUser,
        body: { article: { title: "T", description: "d", body: "b", tagList: ["dragons", "  ab", "cd"] } },
      },
      res,
      vi.fn(),
    );

    expect(created.addTagList).toHaveBeenCalledWith(existingTag);
    expect(Tag.create).toHaveBeenCalledTimes(1);
    expect(Tag.create).toHaveBeenCalledWith({ name: "ab" });
    expect(created.addTagList).toHaveBeenCalledWith(newTag);
    expect(created.addTagList).toHaveBeenCalledTimes(2);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  // AC-084: an optional image URL is stored when provided on creation.
  test("image URL provided -> passed through to Article.create", async () => {
    Article.findOne.mockResolvedValue(null);
    Article.create.mockResolvedValue(makeArticle({ author: loggedUser }));

    await createArticle(
      {
        loggedUser,
        body: {
          article: {
            title: "T",
            description: "d",
            body: "b",
            image: "https://example.com/cover.png",
            tagList: [],
          },
        },
      },
      makeRes(),
      vi.fn(),
    );

    expect(Article.create).toHaveBeenCalledWith(
      expect.objectContaining({ image: "https://example.com/cover.png" }),
    );
  });

  // AC-087: creation still succeeds without an image (REQ-015 unaffected -
  // image is optional, not a required field).
  test("no image provided -> creation still succeeds", async () => {
    Article.findOne.mockResolvedValue(null);
    Article.create.mockResolvedValue(makeArticle({ author: loggedUser }));
    const res = makeRes();

    await createArticle(
      { loggedUser, body: { article: { title: "T", description: "d", body: "b", tagList: [] } } },
      res,
      vi.fn(),
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(Article.create).toHaveBeenCalledWith(expect.objectContaining({ image: undefined }));
  });
});

describe("updateArticle", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await updateArticle({ loggedUser: undefined, params: {}, body: { article: {} } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  test("nonexistent slug -> NotFoundError", async () => {
    Article.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await updateArticle(
      { loggedUser: makeFollowableUser(), params: { slug: "missing" }, body: { article: {} } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-024 / AC-056: only the article's author may update it.
  test("non-author update -> ForbiddenError, article not saved", async () => {
    const author = makeFollowableUser({ id: 1 });
    const article = makeArticle({ author });
    Article.findOne.mockResolvedValue(article);
    const next = vi.fn();

    await updateArticle(
      {
        loggedUser: makeFollowableUser({ id: 2 }),
        params: { slug: "a-slug" },
        body: { article: { title: "New" } },
      },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
    expect(article.save).not.toHaveBeenCalled();
  });

  // AC-022: updating the title regenerates the slug, with no check that it
  // collides with another article's slug (only a single lookup - for the
  // article being updated itself - is ever made).
  test("title update regenerates slug without a duplicate-slug check", async () => {
    const author = makeFollowableUser();
    const article = makeArticle({ author, slug: "old-title", title: "Old Title" });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await updateArticle(
      { loggedUser: author, params: { slug: "old-title" }, body: { article: { title: "Brand New Title" } } },
      res,
      vi.fn(),
    );

    expect(article.slug).toBe("brand-new-title");
    expect(article.save).toHaveBeenCalled();
    expect(Article.findOne).toHaveBeenCalledTimes(1);
  });

  // AC-023: a falsy description/body on update leaves the existing value
  // unchanged rather than clearing it.
  test("falsy description and body are left unchanged", async () => {
    const author = makeFollowableUser();
    const article = makeArticle({ author, description: "original description", body: "original body" });
    Article.findOne.mockResolvedValue(article);

    await updateArticle(
      { loggedUser: author, params: { slug: "a-slug" }, body: { article: { description: "", body: "" } } },
      makeRes(),
      vi.fn(),
    );

    expect(article.description).toBe("original description");
    expect(article.body).toBe("original body");
  });

  // AC-084: a falsy image on update leaves the existing image unchanged,
  // mirroring the description/body boundary above (REQ-017).
  test("falsy image is left unchanged", async () => {
    const author = makeFollowableUser();
    const article = makeArticle({ author, image: "https://example.com/original.png" });
    Article.findOne.mockResolvedValue(article);

    await updateArticle(
      { loggedUser: author, params: { slug: "a-slug" }, body: { article: { image: "" } } },
      makeRes(),
      vi.fn(),
    );

    expect(article.image).toBe("https://example.com/original.png");
  });

  // AC-084: a new image URL on update replaces the existing one.
  test("truthy image on update replaces the existing one", async () => {
    const author = makeFollowableUser();
    const article = makeArticle({ author, image: "https://example.com/original.png" });
    Article.findOne.mockResolvedValue(article);

    await updateArticle(
      {
        loggedUser: author,
        params: { slug: "a-slug" },
        body: { article: { image: "https://example.com/new.png" } },
      },
      makeRes(),
      vi.fn(),
    );

    expect(article.image).toBe("https://example.com/new.png");
    expect(article.save).toHaveBeenCalled();
  });
});

describe("deleteArticle", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await deleteArticle({ loggedUser: undefined, params: {} }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-025: the article's author can delete it.
  test("author deletes own article", async () => {
    const author = makeFollowableUser();
    const article = makeArticle({ author });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await deleteArticle({ loggedUser: author, params: { slug: "a-slug" } }, res, vi.fn());

    expect(article.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: { body: ["Article deleted successfully"] } });
  });

  // AC-026: a non-author cannot delete someone else's article.
  test("non-author attempts delete -> ForbiddenError, article not destroyed", async () => {
    const article = makeArticle({ author: makeFollowableUser({ id: 1 }) });
    Article.findOne.mockResolvedValue(article);
    const next = vi.fn();

    await deleteArticle(
      { loggedUser: makeFollowableUser({ id: 2 }), params: { slug: "a-slug" } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(ForbiddenError);
    expect(article.destroy).not.toHaveBeenCalled();
  });
});

describe("singleArticle", () => {
  test("nonexistent slug -> NotFoundError", async () => {
    Article.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await singleArticle({ loggedUser: undefined, params: { slug: "missing" } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-027: an existing slug returns the full article shape.
  test("existing slug -> full article shape returned", async () => {
    const author = makeFollowableUser({ username: "jane" });
    const article = makeArticle({ author, tags: [{ name: "dragons" }] });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await singleArticle({ loggedUser: author, params: { slug: "a-slug" } }, res, vi.fn());

    const [{ article: sent }] = res.json.mock.calls[0];
    const plain = toPlainJSON(sent);
    expect(plain).toMatchObject({
      title: "A Slug",
      description: "d",
      body: "b",
      tagList: ["dragons"],
      slug: "a-slug",
    });
    expect(plain.author.username).toBe("jane");
    expect(plain.createdAt).toBeInstanceOf(Date);
  });

  // The article's actual saved-for-later state is appended the same way
  // favorited/following are, so it's correct on a fresh page load - not
  // just after a click in the current session.
  test("appends the viewer's actual read-later save state", async () => {
    const author = makeFollowableUser();
    const article = makeArticle({ author, isSaved: true });
    Article.findOne.mockResolvedValue(article);

    await singleArticle({ loggedUser: author, params: { slug: "a-slug" } }, makeRes(), vi.fn());

    expect(article.hasSavedByUser).toHaveBeenCalledWith(author);
    expect(article.dataValues.isSaved).toBe(true);
  });

  // AC-050 / AC-054 (article half) and AC-006 (author half): an anonymous
  // viewer always sees favorited/following forced to false, while the
  // counts still reflect the true totals.
  test("no loggedUser -> favorited/following forced false, counts are the true totals", async () => {
    const author = makeFollowableUser();
    author.hasFollower.mockResolvedValue(true);
    author.countFollowers.mockResolvedValue(9);
    const article = makeArticle({ author, hasUser: true, favoritesCount: 6 });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await singleArticle({ loggedUser: undefined, params: { slug: "a-slug" } }, res, vi.fn());

    expect(article.dataValues.favorited).toBe(false);
    expect(article.dataValues.favoritesCount).toBe(6);
    expect(article.author.dataValues.following).toBe(false);
    expect(article.author.dataValues.followersCount).toBe(9);
  });
});

describe("allArticles", () => {
  function makeSeedArticles() {
    const janeArticles = [
      makeArticle({
        id: 1,
        slug: "jane-1",
        author: makeFollowableUser({ id: 1, username: "jane" }),
        tags: [{ name: "dragons" }],
        createdAt: new Date("2020-01-01"),
      }),
      makeArticle({
        id: 2,
        slug: "jane-2",
        author: makeFollowableUser({ id: 1, username: "jane" }),
        tags: [],
        createdAt: new Date("2020-01-03"),
      }),
    ];
    const bobArticle = makeArticle({
      id: 3,
      slug: "bob-1",
      author: makeFollowableUser({ id: 2, username: "bob" }),
      tags: [{ name: "training" }],
      createdAt: new Date("2020-01-02"),
    });
    return [...janeArticles, bobArticle];
  }

  // AC-029: filtering by author.
  test("author filter -> only that author's articles", async () => {
    const seed = makeSeedArticles();
    Article.findAndCountAll.mockImplementation(fakeArticleList(seed));
    const res = makeRes();

    await allArticles({ loggedUser: undefined, query: { author: "jane" } }, res, vi.fn());

    const { articles } = res.json.mock.calls[0][0];
    expect(articles.map((a) => a.slug)).toEqual(["jane-2", "jane-1"]);
  });

  // AC-030: filtering by tag.
  test("tag filter -> only articles carrying that tag", async () => {
    const seed = makeSeedArticles();
    Article.findAndCountAll.mockImplementation(fakeArticleList(seed));
    const res = makeRes();

    await allArticles({ loggedUser: undefined, query: { tag: "training" } }, res, vi.fn());

    const { articles } = res.json.mock.calls[0][0];
    expect(articles.map((a) => a.slug)).toEqual(["bob-1"]);
  });

  // AC-033: with no explicit limit/offset, results are capped at 3 per
  // page, newest first, while the total count still reflects every match.
  test("default pagination -> 3 per page, newest first, true total count", async () => {
    const seed = [
      ...makeSeedArticles(),
      makeArticle({
        id: 4,
        slug: "jane-3",
        author: makeFollowableUser({ id: 1, username: "jane" }),
        tags: [],
        createdAt: new Date("2020-01-04"),
      }),
    ];
    Article.findAndCountAll.mockImplementation(fakeArticleList(seed));
    const res = makeRes();

    await allArticles({ loggedUser: undefined, query: {} }, res, vi.fn());

    const { articles, articlesCount } = res.json.mock.calls[0][0];
    expect(articlesCount).toBe(4);
    expect(articles).toHaveLength(3);
    expect(articles[0].slug).toBe("jane-3");
  });

  // AC-031: filtering by which user favorited the article.
  test("favorited filter for an existing user -> only that user's favorites", async () => {
    const favorited = makeArticle({ author: makeFollowableUser(), slug: "favorited-1" });
    const fan = makeInstance(
      { id: 5, username: "fan" },
      { getFavorites: vi.fn().mockResolvedValue([favorited]), countFavorites: vi.fn().mockResolvedValue(1) },
    );
    User.findOne.mockResolvedValue(fan);
    const res = makeRes();

    await allArticles({ loggedUser: undefined, query: { favorited: "fan" } }, res, vi.fn());

    const { articles, articlesCount } = res.json.mock.calls[0][0];
    expect(articles.map((a) => a.slug)).toEqual(["favorited-1"]);
    expect(articlesCount).toBe(1);
  });

  // AC-032: a `favorited` filter naming a nonexistent user fails with a
  // server error rather than an empty list.
  test("favorited filter for a nonexistent user -> generic error, not an empty list", async () => {
    User.findOne.mockResolvedValue(null);
    const next = vi.fn();

    await allArticles({ loggedUser: undefined, query: { favorited: "ghost" } }, makeRes(), next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).not.toBeInstanceOf(NotFoundError);
    expect(error).not.toBeInstanceOf(FieldRequiredError);
  });

  // Trending sort: ordered by favorite count, highest first. Equal counts
  // keep the newest-first order the underlying query already returns them
  // in (a stable sort's tie-break), matching how every other listing
  // orders newest first by default.
  // AC-126
  test("sort=trending -> ordered by favorite count, highest first, newest-first tie-break", async () => {
    const author = makeFollowableUser();
    const seed = [
      makeArticle({ id: 1, slug: "c-newer-tied", author, favoritesCount: 2, createdAt: new Date("2020-01-03") }),
      makeArticle({ id: 2, slug: "a-most-favorited", author, favoritesCount: 5, createdAt: new Date("2020-01-01") }),
      makeArticle({ id: 3, slug: "b-older-tied", author, favoritesCount: 2, createdAt: new Date("2020-01-02") }),
    ];
    // findAll is only ever called with `order: [["createdAt", "DESC"]]`
    // (mirroring the default listing query), so the mock returns rows in
    // that same newest-first order for the controller to sort further.
    Article.findAll.mockResolvedValue(
      [...seed].sort((a, b) => b.dataValues.createdAt - a.dataValues.createdAt),
    );
    // Favorite counts come from one aggregate query, not one per article -
    // mirrors each article's own `favoritesCount` given to makeArticle above.
    mockFavoriteCounts({ 1: 2, 2: 5, 3: 2 });
    const res = makeRes();

    await allArticles({ loggedUser: undefined, query: { sort: "trending" } }, res, vi.fn());

    const { articles } = res.json.mock.calls[0][0];
    expect(articles.map((a) => a.slug)).toEqual([
      "a-most-favorited",
      "c-newer-tied",
      "b-older-tied",
    ]);
  });

  // The favorite-count aggregate query runs once for the whole matching
  // set, not once per article - locks in the fix for the N+1 cost this
  // sort mode would otherwise have on a large, unpaginated article table.
  // With 5 matching articles and a page size of 3, `countUsers` should
  // only be called for the 3 articles that make the final page (via the
  // existing, unrelated appendFavorites post-processing loop every
  // listing path already goes through) - never once per matching article
  // during the sort itself.
  test("sort=trending -> fetches favorite counts in a single aggregate query, not one per article", async () => {
    const author = makeFollowableUser();
    const seed = Array.from({ length: 5 }, (_, i) =>
      makeArticle({ id: i + 1, slug: `article-${i + 1}`, author, favoritesCount: 5 - i }),
    );
    Article.findAll.mockResolvedValue(seed);
    mockFavoriteCounts({ 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 });

    await allArticles({ loggedUser: undefined, query: { sort: "trending" } }, makeRes(), vi.fn());

    expect(Favorites.findAll).toHaveBeenCalledTimes(1);
    const countUsersCalls = seed.filter((article) => article.countUsers.mock.calls.length > 0);
    expect(countUsersCalls).toHaveLength(3);
  });

  // Trending composes with tag/author filtering rather than only sorting
  // an unfiltered set.
  // AC-127
  test("sort=trending -> composes with a tag filter instead of sorting the whole table", async () => {
    const author = makeFollowableUser();
    const seed = [makeArticle({ id: 1, slug: "tagged", author, favoritesCount: 1, tags: ["node"] })];
    Article.findAll.mockResolvedValue(seed);
    mockFavoriteCounts({ 1: 1 });

    await allArticles({ loggedUser: undefined, query: { sort: "trending", tag: "node" } }, makeRes(), vi.fn());

    const [{ include }] = Article.findAll.mock.calls[0];
    expect(include[0]).toMatchObject({ where: { name: "node" } });
  });

  // Trending composes with `favorited` (sorts that user's favorited
  // articles by count) rather than silently ignoring `sort` whenever
  // `favorited` is present.
  // AC-127
  test("sort=trending -> composes with favorited instead of silently ignoring the sort", async () => {
    const author = makeFollowableUser();
    const seed = [
      makeArticle({ id: 1, slug: "less-favorited", author, favoritesCount: 1 }),
      makeArticle({ id: 2, slug: "most-favorited", author, favoritesCount: 9 }),
    ];
    const favoritedByUser = makeInstance(
      { username: "jane" },
      { getFavorites: vi.fn().mockResolvedValue(seed) },
    );
    User.findOne.mockResolvedValue(favoritedByUser);
    mockFavoriteCounts({ 1: 1, 2: 9 });

    const res = makeRes();
    await allArticles(
      { loggedUser: undefined, query: { sort: "trending", favorited: "jane" } },
      res,
      vi.fn(),
    );

    const { articles } = res.json.mock.calls[0][0];
    expect(articles.map((a) => a.slug)).toEqual(["most-favorited", "less-favorited"]);
    expect(favoritedByUser.getFavorites).toHaveBeenCalled();
  });

  // Trending sort still uses this app's standard page size and reports the
  // true total count across all matches, same as the default listing.
  // AC-128
  test("sort=trending -> paginates at the standard page size with a true total count", async () => {
    const author = makeFollowableUser();
    const seed = Array.from({ length: 5 }, (_, i) =>
      makeArticle({
        id: i + 1,
        slug: `article-${i + 1}`,
        author,
        favoritesCount: 5 - i,
        createdAt: new Date(`2020-01-0${i + 1}`),
      }),
    );
    Article.findAll.mockResolvedValue(seed);
    mockFavoriteCounts({ 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 });
    const res = makeRes();

    await allArticles({ loggedUser: undefined, query: { sort: "trending" } }, res, vi.fn());

    const { articles, articlesCount } = res.json.mock.calls[0][0];
    expect(articlesCount).toBe(5);
    expect(articles).toHaveLength(3);
    expect(articles.map((a) => a.slug)).toEqual(["article-1", "article-2", "article-3"]);
  });

  // Trending sort's second page picks up where the first left off, using
  // the same offset*limit paging math as the default listing.
  test("sort=trending -> second page continues from the first", async () => {
    const author = makeFollowableUser();
    const seed = Array.from({ length: 5 }, (_, i) =>
      makeArticle({
        id: i + 1,
        slug: `article-${i + 1}`,
        author,
        favoritesCount: 5 - i,
        createdAt: new Date(`2020-01-0${i + 1}`),
      }),
    );
    Article.findAll.mockResolvedValue(seed);
    mockFavoriteCounts({ 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 });
    const res = makeRes();

    await allArticles({ loggedUser: undefined, query: { sort: "trending", offset: 1 } }, res, vi.fn());

    const { articles } = res.json.mock.calls[0][0];
    expect(articles.map((a) => a.slug)).toEqual(["article-4", "article-5"]);
  });

  // Keyword search (REQ-062). One article per match location: "dragon"
  // appears in id 1's title, id 3's body; "rice" in id 2's description.
  function makeSearchSeed() {
    const jane = makeFollowableUser({ id: 1, username: "jane" });
    return [
      makeArticle({
        id: 1,
        slug: "training-dragons",
        title: "Training Dragons",
        description: "a guide",
        body: "scales and fire",
        author: jane,
        tags: [{ name: "dragons" }],
        createdAt: new Date("2020-01-01"),
      }),
      makeArticle({
        id: 2,
        slug: "cooking-rice",
        title: "Cooking Rice",
        description: "RICE recipes",
        body: "plain food",
        author: jane,
        tags: [],
        createdAt: new Date("2020-01-02"),
      }),
      makeArticle({
        id: 3,
        slug: "old-tales",
        title: "Old Tales",
        description: "misc",
        body: "dragon lore",
        author: jane,
        tags: [{ name: "lore" }],
        createdAt: new Date("2020-01-03"),
      }),
    ];
  }

  // AC-135/AC-136: search matches title, description, and body
  // case-insensitively, newest first.
  test("search -> case-insensitive matches across title, description, and body", async () => {
    Article.findAndCountAll.mockImplementation(fakeArticleList(makeSearchSeed()));
    const res = makeRes();

    await allArticles(
      { loggedUser: undefined, query: { search: "DRAGON" } },
      res,
      vi.fn(),
    );
    const dragonByTitleOrBody = res.json.mock.calls[0][0];
    expect(dragonByTitleOrBody.articles.map((a) => a.slug)).toEqual([
      "old-tales",
      "training-dragons",
    ]);

    const res2 = makeRes();
    await allArticles(
      { loggedUser: undefined, query: { search: "rice" } },
      res2,
      vi.fn(),
    );
    expect(res2.json.mock.calls[0][0].articles.map((a) => a.slug)).toEqual([
      "cooking-rice",
    ]);
  });

  // AC-137: an empty or whitespace-only keyword applies no filter and
  // returns the full listing rather than erroring.
  test("whitespace-only search -> no filter, full listing", async () => {
    Article.findAndCountAll.mockImplementation(fakeArticleList(makeSearchSeed()));
    const res = makeRes();

    await allArticles(
      { loggedUser: undefined, query: { search: "   " } },
      res,
      vi.fn(),
    );

    const { articles, articlesCount } = res.json.mock.calls[0][0];
    expect(articlesCount).toBe(3);
    expect(articles.map((a) => a.slug)).toEqual([
      "old-tales",
      "cooking-rice",
      "training-dragons",
    ]);
  });

  // AC-138: search keeps the standard 3-per-page page size and reports
  // the true total count across all matches.
  test("search -> paginates at the standard page size with a true total count", async () => {
    const seed = [
      ...makeSearchSeed(),
      makeArticle({
        id: 4,
        slug: "dragon-again",
        title: "Dragon Again",
        description: "d",
        body: "b",
        author: makeFollowableUser({ id: 1, username: "jane" }),
        tags: [],
        createdAt: new Date("2020-01-04"),
      }),
      makeArticle({
        id: 5,
        slug: "dragonmore",
        title: "Dragonmore",
        description: "d",
        body: "b",
        author: makeFollowableUser({ id: 1, username: "jane" }),
        tags: [],
        createdAt: new Date("2020-01-05"),
      }),
    ];
    Article.findAndCountAll.mockImplementation(fakeArticleList(seed));
    const res = makeRes();

    await allArticles(
      { loggedUser: undefined, query: { search: "dragon" } },
      res,
      vi.fn(),
    );

    const { articles, articlesCount } = res.json.mock.calls[0][0];
    expect(articlesCount).toBe(4);
    expect(articles).toHaveLength(3);
    expect(articles.map((a) => a.slug)).toEqual([
      "dragonmore",
      "dragon-again",
      "old-tales",
    ]);
  });

  // AC-139: search ANDs into the existing tag filter rather than
  // replacing it (same composition rule REQ-013 gives author/tag/favorited).
  test("search combines with the tag filter", async () => {
    Article.findAndCountAll.mockImplementation(fakeArticleList(makeSearchSeed()));
    const res = makeRes();

    await allArticles(
      { loggedUser: undefined, query: { search: "dragon", tag: "lore" } },
      res,
      vi.fn(),
    );

    const { articles, articlesCount } = res.json.mock.calls[0][0];
    expect(articlesCount).toBe(1);
    expect(articles.map((a) => a.slug)).toEqual(["old-tales"]);
  });

  // Multi-tag (AND) filtering (REQ-063). Seed pairs for the join-table
  // mock mirror each article's tags.
  function makeMultiTagSeed() {
    const jane = makeFollowableUser({ id: 1, username: "jane" });
    const bob = makeFollowableUser({ id: 2, username: "bob" });
    const articles = [
      makeArticle({
        id: 1,
        slug: "both-jane",
        title: "Both Tags",
        author: jane,
        tags: [{ name: "dragons" }, { name: "training" }],
        createdAt: new Date("2020-01-01"),
      }),
      makeArticle({
        id: 2,
        slug: "dragons-only",
        title: "Dragons Only",
        author: jane,
        tags: [{ name: "dragons" }],
        createdAt: new Date("2020-01-02"),
      }),
      makeArticle({
        id: 3,
        slug: "both-bob",
        title: "Both Tags Bob",
        author: bob,
        tags: [{ name: "dragons" }, { name: "training" }],
        createdAt: new Date("2020-01-03"),
      }),
    ];
    const pairs = [
      [1, "dragons"], [1, "training"],
      [2, "dragons"],
      [3, "dragons"], [3, "training"],
    ];
    return { articles, pairs, jane };
  }

  // AC-140: several tag values return only articles carrying ALL of
  // them, newest first — whether sent as repeated params or one
  // comma-separated value.
  test("multiple tags -> only articles carrying every tag (repeated params)", async () => {
    const { articles, pairs } = makeMultiTagSeed();
    Article.findAndCountAll.mockImplementation(fakeArticleList(articles));
    mockTagIntersection(pairs);
    const res = makeRes();

    await allArticles(
      { loggedUser: undefined, query: { tag: ["dragons", "training"] } },
      res,
      vi.fn(),
    );

    const { articles: returned, articlesCount } = res.json.mock.calls[0][0];
    expect(articlesCount).toBe(2);
    expect(returned.map((a) => a.slug)).toEqual(["both-bob", "both-jane"]);
  });

  test("multiple tags -> comma-separated form behaves the same", async () => {
    const { articles, pairs } = makeMultiTagSeed();
    Article.findAndCountAll.mockImplementation(fakeArticleList(articles));
    mockTagIntersection(pairs);
    const res = makeRes();

    await allArticles(
      { loggedUser: undefined, query: { tag: " training , dragons " } },
      res,
      vi.fn(),
    );

    expect(res.json.mock.calls[0][0].articles.map((a) => a.slug)).toEqual([
      "both-bob",
      "both-jane",
    ]);
  });

  // AC-141: a single tag keeps REQ-013's exact behavior —
  // no join-table intersection query is issued.
  test("single tag -> REQ-013 behavior, no intersection query", async () => {
    const { articles, pairs } = makeMultiTagSeed();
    Article.findAndCountAll.mockImplementation(fakeArticleList(articles));
    const res = makeRes();

    await allArticles(
      { loggedUser: undefined, query: { tag: "dragons" } },
      res,
      vi.fn(),
    );

    expect(TagList.findAll).not.toHaveBeenCalled();
    expect(res.json.mock.calls[0][0].articles.map((a) => a.slug)).toEqual([
      "both-bob",
      "dragons-only",
      "both-jane",
    ]);
  });

  // AC-140: when no article carries every requested tag, the listing
  // is empty without running the main query.
  test("multiple tags with no common article -> empty listing", async () => {
    const { articles } = makeMultiTagSeed();
    Article.findAndCountAll.mockImplementation(fakeArticleList(articles));
    mockTagIntersection([[2, "dragons"]]);
    const res = makeRes();

    await allArticles(
      { loggedUser: undefined, query: { tag: ["dragons", "nonexistent"] } },
      res,
      vi.fn(),
    );

    expect(res.json.mock.calls[0][0]).toEqual({ articles: [], articlesCount: 0 });
    expect(Article.findAndCountAll).not.toHaveBeenCalled();
  });

  // AC-144: multi-tag composes with the author filter.
  test("multiple tags combine with the author filter", async () => {
    const { articles, pairs } = makeMultiTagSeed();
    Article.findAndCountAll.mockImplementation(fakeArticleList(articles));
    mockTagIntersection(pairs);
    const res = makeRes();

    await allArticles(
      { loggedUser: undefined, query: { tag: ["dragons", "training"], author: "bob" } },
      res,
      vi.fn(),
    );

    const { articles: returned, articlesCount } = res.json.mock.calls[0][0];
    expect(articlesCount).toBe(1);
    expect(returned.map((a) => a.slug)).toEqual(["both-bob"]);
  });

  // AC-143: multi-tag keeps the standard page size and true count.
  test("multiple tags -> standard page size with true total count", async () => {
    const { articles, pairs, jane } = makeMultiTagSeed();
    const fourth = makeArticle({
      id: 4,
      slug: "both-again",
      title: "Both Again",
      author: jane,
      tags: [{ name: "dragons" }, { name: "training" }],
      createdAt: new Date("2020-01-04"),
    });
    Article.findAndCountAll.mockImplementation(fakeArticleList([...articles, fourth]));
    mockTagIntersection([...pairs, [4, "dragons"], [4, "training"]]);
    const res = makeRes();

    await allArticles(
      { loggedUser: undefined, query: { tag: ["dragons", "training"] } },
      res,
      vi.fn(),
    );

    const { articles: returned, articlesCount } = res.json.mock.calls[0][0];
    expect(articlesCount).toBe(3);
    expect(returned).toHaveLength(3);
    expect(returned.map((a) => a.slug)).toEqual(["both-again", "both-bob", "both-jane"]);
  });
});

describe("articlesFeed", () => {
  test("no loggedUser -> UnauthorizedError", async () => {
    const next = vi.fn();

    await articlesFeed({ loggedUser: undefined, query: {} }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(UnauthorizedError);
  });

  // AC-034: only articles by followed authors are returned, newest first.
  test("returns only followed authors' articles, newest first", async () => {
    const followedAuthor = makeFollowableUser({ id: 10, username: "followed" });
    const otherAuthor = makeFollowableUser({ id: 20, username: "other" });
    const seed = [
      makeArticle({ id: 1, slug: "old", author: followedAuthor, createdAt: new Date("2020-01-01") }),
      makeArticle({ id: 2, slug: "new", author: followedAuthor, createdAt: new Date("2020-01-05") }),
      makeArticle({ id: 3, slug: "not-followed", author: otherAuthor, createdAt: new Date("2020-01-06") }),
    ];
    Article.findAndCountAll.mockImplementation(fakeArticleList(seed));
    const loggedUser = makeInstance(
      { id: 99 },
      { getFollowing: vi.fn().mockResolvedValue([{ id: 10 }]) },
    );
    const res = makeRes();

    await articlesFeed({ loggedUser, query: {} }, res, vi.fn());

    const { articles, articlesCount } = res.json.mock.calls[0][0];
    expect(articlesCount).toBe(2);
    expect(articles.map((a) => a.slug)).toEqual(["new", "old"]);
  });

  // AC-035: following no one returns zero articles, not an error.
  test("following no one -> empty feed, not an error", async () => {
    const seed = [makeArticle({ author: makeFollowableUser() })];
    Article.findAndCountAll.mockImplementation(fakeArticleList(seed));
    const loggedUser = makeInstance({ id: 99 }, { getFollowing: vi.fn().mockResolvedValue([]) });
    const res = makeRes();
    const next = vi.fn();

    await articlesFeed({ loggedUser, query: {} }, res, next);

    expect(next).not.toHaveBeenCalled();
    const { articles, articlesCount } = res.json.mock.calls[0][0];
    expect(articles).toEqual([]);
    expect(articlesCount).toBe(0);
  });
});
