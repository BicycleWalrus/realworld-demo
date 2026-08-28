const { UnauthorizedError, NotFoundError } = require("../helper/customErrors");
const { appendFollowers, appendAuthorStats } = require("../helper/helpers");
const { User } = require("../models");
const { Op } = require("sequelize");

//? Profile
const getProfile = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    const { username } = req.params;

    const profile = await User.findOne({
      where: { username: username },
      attributes: { exclude: "email" },
    });
    if (!profile) throw new NotFoundError("User profile");

    await appendFollowers(loggedUser, profile);
    await appendAuthorStats(profile);

    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

//? User Directory (REQ-074, REQ-075, REQ-076)
const listProfiles = async (req, res, next) => {
  try {
    const { limit = 10, offset = 0, username } = req.query;

    const profiles = await User.findAndCountAll({
      attributes: { exclude: ["email"] },
      limit: parseInt(limit),
      offset: offset * limit,
      order: [["username", "ASC"]],
      // REQ-079: optional case-insensitive username-prefix filter reused by
      // comment @mention autocomplete. Additive - omitted/empty leaves this
      // endpoint's default (unfiltered) directory listing unchanged.
      ...(username && { where: { username: { [Op.iLike]: `${username}%` } } }),
    });

    res.json({ profiles: profiles.rows, profilesCount: profiles.count });
  } catch (error) {
    next(error);
  }
};

//* Follow/Unfollow Profile
const followToggler = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const { username } = req.params;

    const profile = await User.findOne({
      where: { username: username },
      attributes: { exclude: "email" },
    });
    if (!profile) throw new NotFoundError("User profile");

    if (req.method === "POST") {
      await profile.addFollower(loggedUser);
    } else if (req.method === "DELETE") {
      await profile.removeFollower(loggedUser);
    }

    await appendFollowers(loggedUser, profile);

    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, listProfiles, followToggler };
