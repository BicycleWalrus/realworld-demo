const {
  AlreadyTakenError,
  ForbiddenError,
  FieldRequiredError,
  NotFoundError,
  UnauthorizedError,
} = require("../helper/customErrors");
const { makeInstance, toPlainJSON, makeRes, mockRequire } = require("../test-utils/fakeModels");

const Article = { findOne: vi.fn(), findAndCountAll: vi.fn(), create: vi.fn() };
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

function makeArticle({ author, tags = [], hasUser = false, favoritesCount = 0, published = true, ...data }) {
  return makeInstance(
    {
      id: 1,
      slug: "a-slug",
      title: "A Slug",
      description: "d",
      body: "b",
      tagList: tags,
      published,
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
  return ({ include = [], limit, offset, where = {} } = {}) => {
    let rows = [...seedRows].sort((a, b) => b.dataValues.createdAt - a.dataValues.createdAt);

    const tagFilter = include.find((i) => i.as === "tagList")?.where?.name;
    const authorFilter = include.find((i) => i.as === "author")?.where?.username;
    if (tagFilter) rows = rows.filter((r) => r.tagList.some((t) => t.name === tagFilter));
    if (authorFilter) rows = rows.filter((r) => r.author.username === authorFilter);
    if (where.userId) rows = rows.filter((r) => where.userId.includes(r.author.id));
    if (where.published) rows = rows.filter((r) => r.dataValues.published !== false);

    const count = rows.length;
    rows = rows.slice(offset, offset + limit);
    return Promise.resolve({ rows, count });
  };
}

beforeEach(() => {
  Article.findOne.mockReset();
  Article.findAndCountAll.mockReset();
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

  // AC-096: omitting `published` defaults the article to published.
  test("omitting published -> Article.create called with published: true", async () => {
    Article.findOne.mockResolvedValue(null);
    Article.create.mockResolvedValue(makeArticle({ author: loggedUser }));

    await createArticle(
      { loggedUser, body: { article: { title: "T", description: "d", body: "b", tagList: [] } } },
      makeRes(),
      vi.fn(),
    );

    expect(Article.create).toHaveBeenCalledWith(expect.objectContaining({ published: true }));
  });

  // AC-097: an explicit published: false is passed through as a draft.
  test("published: false -> Article.create called with published: false", async () => {
    Article.findOne.mockResolvedValue(null);
    Article.create.mockResolvedValue(makeArticle({ author: loggedUser }));

    await createArticle(
      {
        loggedUser,
        body: { article: { title: "T", description: "d", body: "b", tagList: [], published: false } },
      },
      makeRes(),
      vi.fn(),
    );

    expect(Article.create).toHaveBeenCalledWith(expect.objectContaining({ published: false }));
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

  // AC-098: the author can publish a draft via this same endpoint.
  test("published: true on a draft -> article.published becomes true", async () => {
    const author = makeFollowableUser();
    const article = makeArticle({ author, published: false });
    Article.findOne.mockResolvedValue(article);

    await updateArticle(
      { loggedUser: author, params: { slug: "a-slug" }, body: { article: { published: true } } },
      makeRes(),
      vi.fn(),
    );

    expect(article.published).toBe(true);
    expect(article.save).toHaveBeenCalled();
  });

  // A missing/non-boolean published value leaves the current state unchanged.
  test("omitting published on update leaves the current published state unchanged", async () => {
    const author = makeFollowableUser();
    const article = makeArticle({ author, published: false });
    Article.findOne.mockResolvedValue(article);

    await updateArticle(
      { loggedUser: author, params: { slug: "a-slug" }, body: { article: { title: "New" } } },
      makeRes(),
      vi.fn(),
    );

    expect(article.published).toBe(false);
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

  // AC-102: a draft is 404 (not 403) for anyone other than its author, so a
  // non-author can't distinguish "no article" from "a draft exists here."
  test("draft article, anonymous viewer -> NotFoundError", async () => {
    const author = makeFollowableUser();
    const article = makeArticle({ author, published: false });
    Article.findOne.mockResolvedValue(article);
    const next = vi.fn();

    await singleArticle({ loggedUser: undefined, params: { slug: "a-slug" } }, makeRes(), next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  test("draft article, different logged-in user -> NotFoundError", async () => {
    const author = makeFollowableUser({ id: 1 });
    const article = makeArticle({ author, published: false });
    Article.findOne.mockResolvedValue(article);
    const next = vi.fn();

    await singleArticle(
      { loggedUser: makeFollowableUser({ id: 2 }), params: { slug: "a-slug" } },
      makeRes(),
      next,
    );

    expect(next.mock.calls[0][0]).toBeInstanceOf(NotFoundError);
  });

  // AC-103: the draft's own author can retrieve it.
  test("draft article, its own author -> full article returned", async () => {
    const author = makeFollowableUser();
    const article = makeArticle({ author, published: false });
    Article.findOne.mockResolvedValue(article);
    const res = makeRes();

    await singleArticle({ loggedUser: author, params: { slug: "a-slug" } }, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ article });
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

  // AC-099: a draft is excluded from another viewer's (or anonymous) listing.
  test("draft excluded from author filter for a different/anonymous viewer", async () => {
    const jane = makeFollowableUser({ id: 1, username: "jane" });
    const seed = [
      makeArticle({ id: 1, slug: "jane-published", author: jane, createdAt: new Date("2020-01-01") }),
      makeArticle({ id: 2, slug: "jane-draft", author: jane, published: false, createdAt: new Date("2020-01-02") }),
    ];
    Article.findAndCountAll.mockImplementation(fakeArticleList(seed));
    const res = makeRes();

    await allArticles({ loggedUser: undefined, query: { author: "jane" } }, res, vi.fn());

    const { articles } = res.json.mock.calls[0][0];
    expect(articles.map((a) => a.slug)).toEqual(["jane-published"]);
  });

  // AC-100: the draft's own author sees it via their own author filter.
  test("draft included when the author filter matches the logged-in viewer", async () => {
    const jane = makeFollowableUser({ id: 1, username: "jane" });
    const seed = [
      makeArticle({ id: 1, slug: "jane-published", author: jane, createdAt: new Date("2020-01-01") }),
      makeArticle({ id: 2, slug: "jane-draft", author: jane, published: false, createdAt: new Date("2020-01-02") }),
    ];
    Article.findAndCountAll.mockImplementation(fakeArticleList(seed));
    const res = makeRes();

    await allArticles({ loggedUser: jane, query: { author: "jane" } }, res, vi.fn());

    const { articles } = res.json.mock.calls[0][0];
    expect(articles.map((a) => a.slug)).toEqual(["jane-draft", "jane-published"]);
  });

  // AC-104: no self-exception on the favorited filter - the author's own
  // draft stays excluded even when the author is the one browsing favorites.
  test("draft excluded from the favorited filter even for its own author", async () => {
    const jane = makeFollowableUser({ id: 1, username: "jane" });
    const draft = makeArticle({ author: jane, slug: "jane-draft", published: false });
    const fan = makeInstance(
      { id: 1, username: "jane" },
      {
        getFavorites: vi.fn().mockImplementation((options) =>
          Promise.resolve(options.where?.published ? [] : [draft]),
        ),
        countFavorites: vi.fn().mockResolvedValue(1),
      },
    );
    User.findOne.mockResolvedValue(fan);
    const res = makeRes();

    await allArticles({ loggedUser: jane, query: { favorited: "jane" } }, res, vi.fn());

    const { articles } = res.json.mock.calls[0][0];
    expect(articles).toEqual([]);
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

  // AC-101: a followed author's draft is excluded from the feed.
  test("a followed author's draft is excluded from the feed", async () => {
    const followedAuthor = makeFollowableUser({ id: 10, username: "followed" });
    const seed = [
      makeArticle({ id: 1, slug: "published", author: followedAuthor, createdAt: new Date("2020-01-01") }),
      makeArticle({
        id: 2,
        slug: "draft",
        author: followedAuthor,
        published: false,
        createdAt: new Date("2020-01-02"),
      }),
    ];
    Article.findAndCountAll.mockImplementation(fakeArticleList(seed));
    const loggedUser = makeInstance(
      { id: 99 },
      { getFollowing: vi.fn().mockResolvedValue([{ id: 10 }]) },
    );
    const res = makeRes();

    await articlesFeed({ loggedUser, query: {} }, res, vi.fn());

    const { articles } = res.json.mock.calls[0][0];
    expect(articles.map((a) => a.slug)).toEqual(["published"]);
  });
});
