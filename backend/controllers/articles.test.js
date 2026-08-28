const {
  AlreadyTakenError,
  ForbiddenError,
  FieldRequiredError,
  NotFoundError,
  UnauthorizedError,
} = require("../helper/customErrors");
const { makeInstance, toPlainJSON, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn(), findAndCountAll: vi.fn(), findAll: vi.fn(), create: vi.fn() };
const Tag = { findByPk: vi.fn(), create: vi.fn() };
const User = { findOne: vi.fn() };
mockRequire(require.resolve("../models"), { Article, Tag, User });

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

function makeArticle({ author, tags = [], hasUser = false, favoritesCount = 0, ...data }) {
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
    if (tagFilter) rows = rows.filter((r) => r.tagList.some((t) => t.name === tagFilter));
    if (authorFilter) rows = rows.filter((r) => r.author.username === authorFilter);
    if (where?.userId) rows = rows.filter((r) => where.userId.includes(r.author.id));

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
    const res = makeRes();

    await allArticles({ loggedUser: undefined, query: { sort: "trending" } }, res, vi.fn());

    const { articles } = res.json.mock.calls[0][0];
    expect(articles.map((a) => a.slug)).toEqual([
      "a-most-favorited",
      "c-newer-tied",
      "b-older-tied",
    ]);
  });

  // Trending sort still uses this app's standard page size and reports the
  // true total count across all matches, same as the default listing.
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
    const res = makeRes();

    await allArticles({ loggedUser: undefined, query: { sort: "trending", offset: 1 } }, res, vi.fn());

    const { articles } = res.json.mock.calls[0][0];
    expect(articles.map((a) => a.slug)).toEqual(["article-4", "article-5"]);
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
