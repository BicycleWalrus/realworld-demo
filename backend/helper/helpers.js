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

module.exports = {
  slugify,
  appendTagList,
  appendFavorites,
  appendFollowers,
  appendAuthorStats,
};
