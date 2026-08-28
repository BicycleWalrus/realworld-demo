const { NotFoundError, UnauthorizedError } = require("../helper/customErrors");
const { Tag } = require("../models");

// REQ-089: follow/unfollow a Tag. Mirrors REQ-027's rule for following a
// user - requires a resolved, authenticated user and an existing target
// (here, the Tag itself, looked up by its primary key/name). Backed by the
// TagFollows join table (via User's `followedTags` association), which is
// entirely separate from the article TagList join table (REQ-020/REQ-021):
// following a tag never creates, attaches, or removes it from any article.
const tagFollowToggler = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { name } = req.params;
    const tag = await Tag.findByPk(name);
    if (!tag) throw new NotFoundError("Tag");

    if (req.method === "POST") await loggedUser.addFollowedTag(tag);
    if (req.method === "DELETE") await loggedUser.removeFollowedTag(tag);

    res.json({ tag: { name: tag.name }, following: req.method === "POST" });
  } catch (error) {
    next(error);
  }
};

// REQ-089: the requesting user's own followed tag names. Privacy is
// enforced by construction - always derived from `loggedUser`, mirroring
// readLaterList's approach for the read-later list.
const followedTags = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const tags = await loggedUser.getFollowedTags();

    res.json({ tags: tags.map((tag) => tag.name) });
  } catch (error) {
    next(error);
  }
};

module.exports = { tagFollowToggler, followedTags };
