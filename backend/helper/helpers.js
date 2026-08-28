const slugify = (string) => {
  return string.trim().toLowerCase().replace(/\W|_/g, "-");
};

// REQ-094/REQ-095/REQ-096: the fixed reaction set. Reactions are a separate,
// independent concept from Favorites - not folded into it and not affecting
// the favorite count.
const REACTION_TYPES = ["like", "insightful", "celebrate"];

const appendTagList = (articleTags, article) => {
  const tagList = articleTags.map((tag) => tag.name);

  if (!article) return tagList;
  article.dataValues.tagList = tagList;
};

const appendFavorites = async (loggedUser, article) => {
  const favorited = await article.hasUser(loggedUser ? loggedUser : null);
  article.dataValues.favorited = loggedUser ? favorited : false;

  const favoritesCount = await article.countUsers();
  article.dataValues.favoritesCount = favoritesCount;
};

// REQ-053 / REQ-054 / REQ-055 / REQ-056: attaches an author's published
// article count, total favorites summed across those articles, and their
// member-since date, on `profile.dataValues`. Independent of `loggedUser`
// so it is identical for authenticated and anonymous visitors.
const appendAuthorStats = async (profile) => {
  // getArticles() already returns the author's full article list, so its
  // length is the article count — no separate countArticles() query needed.
  const articles = await profile.getArticles();
  const favoritesCounts = await Promise.all(
    articles.map((article) => article.countUsers()),
  );
  const favoritesCount = favoritesCounts.reduce((sum, count) => sum + count, 0);

  profile.dataValues.articleCount = articles.length;
  profile.dataValues.favoritesCount = favoritesCount;
  profile.dataValues.memberSince = profile.get("createdAt");
};

const appendFollowers = async (loggedUser, toAppend) => {
  //
  if (toAppend?.author) {
    const author = await toAppend.getAuthor();

    const following = await author.hasFollower(loggedUser ? loggedUser : null);
    toAppend.author.dataValues.following = loggedUser ? following : false;

    const followersCount = await author.countFollowers();
    toAppend.author.dataValues.followersCount = followersCount;
    //
  } else {
    const following = await toAppend.hasFollower(
      loggedUser ? loggedUser : null,
    );
    toAppend.dataValues.following = loggedUser ? following : false;

    const followersCount = await toAppend.countFollowers();
    toAppend.dataValues.followersCount = followersCount;
  }
};

// REQ-095: attaches a per-reaction-type count (visible to anonymous and
// authenticated viewers alike) and, for an authenticated viewer, their own
// current reaction (or null), on `article.dataValues`. Additive, mirroring
// appendFavorites/appendFollowers - never reads or writes Favorites.
const appendReactions = async (loggedUser, article) => {
  // Required lazily (not at module top level) so this file can still be
  // loaded - e.g. by helpers.test.js's slugify tests - without pulling in a
  // real Sequelize connection; every caller of appendReactions (articles.js,
  // reactions.js) already requires "../models" itself, whether real or, in
  // tests, mocked via mockRequire before this runs.
  const { Reaction } = require("../models");
  const reactions = await Reaction.findAll({ where: { articleId: article.id } });

  const reactionCounts = { like: 0, insightful: 0, celebrate: 0 };
  for (const r of reactions) {
    if (reactionCounts[r.type] !== undefined) reactionCounts[r.type]++;
  }
  article.dataValues.reactionCounts = reactionCounts;

  article.dataValues.reaction = loggedUser
    ? (reactions.find((r) => r.userId === loggedUser.id)?.type ?? null)
    : null;
};

module.exports = {
  slugify,
  appendTagList,
  appendFavorites,
  appendFollowers,
  appendAuthorStats,
  appendReactions,
  REACTION_TYPES,
};
