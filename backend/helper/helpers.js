const slugify = (string) => {
  return string.trim().toLowerCase().replace(/\W|_/g, "-");
};

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

const appendSavedForLater = async (loggedUser, article) => {
  const isSaved = await article.hasSavedByUser(loggedUser ? loggedUser : null);
  article.dataValues.isSaved = loggedUser ? isSaved : false;
};

// The fixed reaction set (REQ-066). Counts are reported for every type,
// always, so the shape is stable regardless of what anyone reacted with.
const REACTION_TYPES = ["like", "insightful", "celebrate"];

const appendReactions = async (loggedUser, article, sequelize) => {
  const rows = await sequelize.models.Reactions.findAll({
    attributes: ["type", "userId"],
    where: { articleId: article.id },
    raw: true,
  });

  const reactions = Object.fromEntries(REACTION_TYPES.map((type) => [type, 0]));
  let viewerReaction = null;
  for (const { type, userId } of rows) {
    if (reactions[type] !== undefined) reactions[type] += 1;
    if (loggedUser && userId === loggedUser.id) viewerReaction = type;
  }

  article.dataValues.reactions = reactions;
  article.dataValues.viewerReaction = viewerReaction;
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

const appendAuthorStats = async (profile) => {
  const articles = await profile.getArticles();

  const favoritesCounts = await Promise.all(
    articles.map((article) => article.countUsers()),
  );
  const totalFavoritesCount = favoritesCounts.reduce(
    (sum, count) => sum + count,
    0,
  );

  profile.dataValues.articleCount = articles.length;
  profile.dataValues.totalFavoritesCount = totalFavoritesCount;
  profile.dataValues.memberSince = profile.createdAt;
};

module.exports = {
  slugify,
  appendTagList,
  appendFavorites,
  appendFollowers,
  appendAuthorStats,
  appendSavedForLater,
  appendReactions,
  REACTION_TYPES,
};
