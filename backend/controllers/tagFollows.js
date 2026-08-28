const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { Tag } = require("../models");

//? Single tag with the viewer's follow state (REQ-065)
const getTag = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    const { name } = req.params;

    const tag = await Tag.findByPk(name);
    if (!tag) throw new NotFoundError("Tag");

    const following = loggedUser ? await loggedUser.hasFollowedTag(tag) : false;

    res.json({ tag: { name: tag.name, following: !!following } });
  } catch (error) {
    next(error);
  }
};

//? Follow a tag (REQ-065)
const followTag = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { name } = req.params;
    const tag = await Tag.findByPk(name);
    if (!tag) throw new NotFoundError("Tag");

    await loggedUser.addFollowedTag(tag);

    res.json({ tag: { name: tag.name, following: true } });
  } catch (error) {
    next(error);
  }
};

//? Unfollow a tag (REQ-065)
const unfollowTag = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { name } = req.params;
    const tag = await Tag.findByPk(name);
    if (!tag) throw new NotFoundError("Tag");

    await loggedUser.removeFollowedTag(tag);

    res.json({ tag: { name: tag.name, following: false } });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTag,
  followTag,
  unfollowTag,
};
