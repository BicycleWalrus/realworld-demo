const { UnauthorizedError, NotFoundError } = require("../helper/customErrors");
const { appendFollowers } = require("../helper/helpers");
const { User } = require("../models");

//? Profile Directory - paginated list of all profiles
const listProfiles = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    const { limit = 12, offset = 0 } = req.query;

    const profiles = await User.findAndCountAll({
      attributes: { exclude: "email" },
      limit: parseInt(limit),
      offset: offset * limit,
      order: [["username", "ASC"]],
    });

    for (let profile of profiles.rows) {
      await appendFollowers(loggedUser, profile);
    }

    res.json({ profiles: profiles.rows, profilesCount: profiles.count });
  } catch (error) {
    next(error);
  }
};

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

    res.json({ profile });
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

module.exports = { listProfiles, getProfile, followToggler };
