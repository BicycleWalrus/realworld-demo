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

const REACTION_TYPES = ["like", "insightful", "celebrate"];

const appendReactions = async (loggedUser, article) => {
  const allReactions = await article.getReactions();

  const reactions = {};
  for (const type of REACTION_TYPES) {
    reactions[type] = allReactions.filter((reaction) => reaction.type === type).length;
  }
  article.dataValues.reactions = reactions;

  const myReaction = loggedUser
    ? allReactions.find((reaction) => reaction.userId === loggedUser.id)?.type || null
    : null;
  article.dataValues.myReaction = myReaction;
};

module.exports = {
  slugify,
  appendTagList,
  appendFavorites,
  appendFollowers,
  appendReactions,
  REACTION_TYPES,
};
