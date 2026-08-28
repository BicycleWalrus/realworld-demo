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

// Fixed, documented set of reaction types. Favoriting remains a separate,
// independent concept (Favorites is untouched) rather than being folded
// into this set.
const REACTION_TYPES = ["like", "insightful", "celebrate"];

const appendReactions = async (loggedUser, article) => {
  const reactions = await article.getReactions();

  const reactionsCounts = Object.fromEntries(
    REACTION_TYPES.map((type) => [type, 0]),
  );
  for (const reaction of reactions) {
    reactionsCounts[reaction.type] += 1;
  }
  article.dataValues.reactionsCounts = reactionsCounts;

  const mine = loggedUser
    ? reactions.find((reaction) => reaction.userId === loggedUser.id)
    : undefined;
  article.dataValues.myReaction = mine ? mine.type : null;
};

module.exports = {
  slugify,
  appendTagList,
  appendFavorites,
  appendFollowers,
  appendReactions,
  REACTION_TYPES,
};
