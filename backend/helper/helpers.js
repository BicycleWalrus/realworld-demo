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

// Lazily required (rather than at module scope) so files that never call
// notifyUser - like this helper's own plain-function tests - never trigger
// loading the real ../models/index.js (which opens a live DB connection
// config). Controllers that DO call this already mockRequire ../models'
// resolved path before requiring anything that transitively reaches here,
// so the lazy require below picks up that same mock via Node's require
// cache, keyed by resolved path.
const notifyUser = async ({ type, recipientId, actorId, articleId, commentId }) => {
  if (recipientId === actorId) return;

  try {
    const { Notification } = require("../models");
    await Notification.create({ type, recipientId, actorId, articleId, commentId });
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
};

module.exports = {
  slugify,
  appendTagList,
  appendFavorites,
  appendFollowers,
  notifyUser,
};
