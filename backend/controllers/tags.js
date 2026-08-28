const { UnauthorizedError, NotFoundError } = require("../helper/customErrors");
const { appendTagFollow } = require("../helper/helpers");
const { Tag } = require("../models");

//? All Tags
const allTags = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    const tagList = await Tag.findAll();

    for (const tag of tagList) {
      await appendTagFollow(loggedUser, tag);
    }

    res.json({ tags: tagList });
  } catch (error) {
    next(error);
  }
};

//* Follow/Unfollow Tag
const tagFollowToggler = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { name } = req.params;
    const tag = await Tag.findByPk(name);
    if (!tag) throw new NotFoundError("Tag");

    if (req.method === "POST") await tag.addFollower(loggedUser);
    if (req.method === "DELETE") await tag.removeFollower(loggedUser);

    await appendTagFollow(loggedUser, tag);

    res.json({ tag });
  } catch (error) {
    next(error);
  }
};

module.exports = { allTags, tagFollowToggler };
