const {
  AlreadyTakenError,
  FieldRequiredError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} = require("../helper/customErrors");
const {
  appendFollowers,
  appendFavorites,
  appendReactions,
  appendTagList,
  slugify,
} = require("../helper/helpers");
const { Article, Tag, User } = require("../models");
const { Op } = require("sequelize");

const includeOptions = [
  { model: Tag, as: "tagList", attributes: ["name"] },
  { model: User, as: "author", attributes: { exclude: ["email"] } },
];

//? All Articles - by Author/by Tag/Favorited by user
const allArticles = async (req, res, next) => {
  try {
    const { loggedUser } = req;

    const { author, tag, favorited, search, sort, limit = 3, offset = 0 } = req.query;
    const term = typeof search === "string" ? search.trim() : "";
    // REQ-061/REQ-062: the "top" sort ranks by favorite count, which is only
    // known once each article is enriched below (DB-agnostic - no raw-SQL
    // ORDER BY on a derived count). So for this branch every matching row is
    // fetched (limit/offset omitted here) and paged after sorting instead.
    const isTop = sort === "top";
    // REQ-070: draft (unpublished) articles are excluded from every listing
    // path (global/tag/search/favorited/top and other users' profiles)
    // unless the viewer is looking at their own profile (author === the
    // logged-in username), in which case their own drafts are included
    // (REQ-071).
    const viewingOwn = !!(author && loggedUser && author === loggedUser.username);
    const publishedFilter = viewingOwn ? {} : { published: true };
    const searchOptions = {
      include: [
        {
          model: Tag,
          as: "tagList",
          attributes: ["name"],
          ...(tag && { where: { name: tag } }),
        },
        {
          model: User,
          as: "author",
          attributes: { exclude: ["email"] },
          ...(author && { where: { username: author } }),
        },
      ],
      ...(!isTop && { limit: parseInt(limit), offset: offset * limit }),
      order: [["createdAt", "DESC"]],
      // AC-088: keyword search matches title, description, or body,
      // case-insensitively (Postgres Op.iLike); additive to the existing
      // author/tag/favorited filters (REQ-013), so it combines (AND) with
      // them rather than replacing them. REQ-070: the published filter is
      // additive here too, alongside (not instead of) the search predicate.
      where: {
        ...publishedFilter,
        ...(term && {
          [Op.or]: [
            { title: { [Op.iLike]: `%${term}%` } },
            { description: { [Op.iLike]: `%${term}%` } },
            { body: { [Op.iLike]: `%${term}%` } },
          ],
        }),
      },
    };

    let articles = { rows: [], count: 0 };
    if (favorited) {
      const user = await User.findOne({ where: { username: favorited } });

      articles.rows = await user.getFavorites(searchOptions);
      articles.count = await user.countFavorites();
    } else {
      articles = await Article.findAndCountAll(searchOptions);
    }

    for (let article of articles.rows) {
      const articleTags = await article.getTagList();

      appendTagList(articleTags, article);
      await appendFollowers(loggedUser, article);
      await appendFavorites(loggedUser, article);

      delete article.dataValues.Favorites;
    }

    // REQ-062/REQ-063: rank the fully-enriched rows by favoritesCount desc,
    // tie-broken by createdAt desc, then slice to the requested page.
    // articlesCount stays the full match total already set above.
    if (isTop) {
      articles.rows = [...articles.rows].sort((a, b) => {
        const favoritesDelta = b.dataValues.favoritesCount - a.dataValues.favoritesCount;
        if (favoritesDelta !== 0) return favoritesDelta;
        return new Date(b.dataValues.createdAt) - new Date(a.dataValues.createdAt);
      });

      const start = offset * limit;
      articles.rows = articles.rows.slice(start, start + parseInt(limit));
    }

    res.json({ articles: articles.rows, articlesCount: articles.count });
  } catch (error) {
    next(error);
  }
};

//* Create Article
const createArticle = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { title, description, body, tagList, image } = req.body.article;
    if (!title) throw new FieldRequiredError("A title");
    if (!description) throw new FieldRequiredError("A description");
    if (!body) throw new FieldRequiredError("An article body");

    // REQ-069: an article is published by default; only an explicit
    // `published: false` creates a draft, so omitting the flag stays
    // backward compatible with the pre-existing create behavior.
    const published = req.body.article.published === false ? false : true;

    const slug = slugify(title);
    const slugInDB = await Article.findOne({ where: { slug: slug } });
    if (slugInDB) throw new AlreadyTakenError("Title");

    // REQ-077: a cover image URL is optional - omitting it is not a
    // validation error, unlike title/description/body above.
    const article = await Article.create({
      slug: slug,
      title: title,
      description: description,
      body: body,
      published: published,
      image: image,
    });

    for (const tag of tagList) {
      const tagInDB = await Tag.findByPk(tag.trim());

      if (tagInDB) {
        await article.addTagList(tagInDB);
      } else if (tag.length > 2) {
        const newTag = await Tag.create({ name: tag.trim() });

        await article.addTagList(newTag);
      }
    }

    delete loggedUser.dataValues.token;

    article.dataValues.tagList = tagList;
    article.setAuthor(loggedUser);
    article.dataValues.author = loggedUser;
    await appendFollowers(loggedUser, loggedUser);
    await appendFavorites(loggedUser, article);

    res.status(201).json({ article });
  } catch (error) {
    next(error);
  }
};

//* Feed
const articlesFeed = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { limit = 3, offset = 0 } = req.query;
    const authors = await loggedUser.getFollowing();
    // REQ-090/REQ-091 (amends REQ-018): the feed is the union of articles by
    // a followed author OR carrying a followed tag - not followed authors
    // alone.
    const followedTagList = await loggedUser.getFollowedTags();

    const authorIds = authors.map((author) => author.id);
    const tagNames = followedTagList.map((tag) => tag.name);

    // REQ-091 (amends REQ-018): the feed is empty only when the user
    // follows neither any author nor any tag.
    if (authorIds.length === 0 && tagNames.length === 0) {
      return res.json({ articles: [], articlesCount: 0 });
    }

    const orConditions = [];
    if (authorIds.length > 0) orConditions.push({ userId: authorIds });
    if (tagNames.length > 0) {
      orConditions.push({ "$tagList.name$": { [Op.in]: tagNames } });
    }

    const articles = await Article.findAndCountAll({
      include: includeOptions,
      limit: parseInt(limit),
      offset: offset * limit,
      order: [["createdAt", "DESC"]],
      // REQ-070: drafts never appear in the feed, regardless of whether the
      // match is via followed author or followed tag.
      where: { published: true, [Op.or]: orConditions },
      // A to-many include ($tagList.name$) combined with limit/offset and
      // findAndCountAll's COUNT needs subQuery:false + distinct:true to
      // avoid duplicated/incorrect counts. Not exercised against a real DB
      // in this environment - see report for caveat.
      subQuery: false,
      distinct: true,
    });

    for (const article of articles.rows) {
      const articleTags = await article.getTagList();

      appendTagList(articleTags, article);
      await appendFollowers(loggedUser, article);
      await appendFavorites(loggedUser, article);
    }

    res.json({ articles: articles.rows, articlesCount: articles.count });
  } catch (error) {
    next(error);
  }
};

// Single Article by slug
const singleArticle = async (req, res, next) => {
  try {
    const { loggedUser } = req;

    const { slug } = req.params;
    const article = await Article.findOne({
      where: { slug: slug },
      include: includeOptions,
    });
    if (!article) throw new NotFoundError("Article");
    // REQ-073: a draft is not-found for anyone but its own author (incl.
    // anonymous visitors), so a draft's existence is never leaked.
    if (!article.published && (!loggedUser || loggedUser.id !== article.author.id)) {
      throw new NotFoundError("Article");
    }

    appendTagList(article.tagList, article);
    await appendFollowers(loggedUser, article);
    await appendFavorites(loggedUser, article);
    // REQ-086/REQ-088: additive per-viewer flag for the detail page's
    // read-later button; unset (false) for anonymous visitors, since the
    // read-later list is private to the logged-in user.
    article.dataValues.readLater = loggedUser ? await loggedUser.hasReadLater(article) : false;
    // REQ-095/REQ-096: additive reaction counts + per-viewer current
    // reaction, independent of Favorites above.
    await appendReactions(loggedUser, article);

    res.json({ article });
  } catch (error) {
    next(error);
  }
};

//* Update Article
const updateArticle = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { slug } = req.params;
    const article = await Article.findOne({
      where: { slug: slug },
      include: includeOptions,
    });
    if (!article) throw new NotFoundError("Article");

    if (loggedUser.id !== article.author.id) {
      throw new ForbiddenError("article");
    }

    const { title, description, body, published, image } = req.body.article;
    if (title) {
      article.slug = slugify(title);
      article.title = title;
    }
    if (description) article.description = description;
    if (body) article.body = body;
    // REQ-072: an author may publish a draft (or unpublish a published
    // article) by setting `published` explicitly on update.
    if (typeof published === "boolean") article.published = published;
    // REQ-077: an author may set or clear the optional cover image on
    // update; `undefined` (field omitted) leaves the existing value alone.
    if (image !== undefined) article.image = image;
    await article.save();

    appendTagList(article.tagList, article);
    await appendFollowers(loggedUser, article);
    await appendFavorites(loggedUser, article);

    res.json({ article });
  } catch (error) {
    next(error);
  }
};

//* Delete Article
const deleteArticle = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { slug } = req.params;
    const article = await Article.findOne({
      where: { slug: slug },
      include: includeOptions,
    });
    if (!article) throw new NotFoundError("Article");

    if (loggedUser.id !== article.author.id) {
      throw new ForbiddenError("article");
    }

    await article.destroy();

    res.json({ message: { body: ["Article deleted successfully"] } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  allArticles,
  createArticle,
  singleArticle,
  updateArticle,
  deleteArticle,
  articlesFeed,
};
