const { Op } = require("sequelize");
const { User } = require("../models");
const { jwtSign } = require("../helper/jwt");
const { bcryptHash, bcryptCompare } = require("../helper/bcrypt");
const {
  ValidationError,
  FieldRequiredError,
  AlreadyTakenError,
  NotFoundError,
} = require("../helper/customErrors");

const MAX_SEARCH_RESULTS = 5;

// Register
const signUp = async (req, res, next) => {
  try {
    const { username, email, bio, image, password } = req.body.user;
    if (!username) throw new FieldRequiredError(`A username`);
    if (!email) throw new FieldRequiredError(`An email`);
    if (!password) throw new FieldRequiredError(`A password`);

    const userExists = await User.findOne({
      where: { email: req.body.user.email },
    });
    if (userExists) throw new AlreadyTakenError("Email", "try logging in");

    const newUser = await User.create({
      email: email,
      username: username,
      bio: bio,
      image: image,
      password: await bcryptHash(password),
    });

    newUser.dataValues.token = await jwtSign(newUser);

    res.status(201).json({ user: newUser });
  } catch (error) {
    next(error);
  }
};

// Login
const signIn = async (req, res, next) => {
  try {
    const { user } = req.body;

    const existentUser = await User.findOne({ where: { email: user.email } });
    if (!existentUser) throw new NotFoundError("Email", "sign in first");

    const pwd = await bcryptCompare(user.password, existentUser.password);
    if (!pwd) throw new ValidationError("Wrong email/password combination");

    existentUser.dataValues.token = await jwtSign(user);

    res.json({ user: existentUser });
  } catch (error) {
    next(error);
  }
};

// Search usernames (for @mention autocomplete and mention-link validation)
const searchUsers = async (req, res, next) => {
  try {
    const search = req.query.search?.trim();
    if (!search) return res.json({ users: [] });

    const matches = await User.findAll({
      where: { username: { [Op.iLike]: `${search}%` } },
      attributes: ["username"],
      limit: MAX_SEARCH_RESULTS,
    });

    res.json({ users: matches.map(({ username }) => username) });
  } catch (error) {
    next(error);
  }
};

const MAX_VERIFY_USERNAMES = 20;

// Verify which of a batch of *exact* usernames exist (for @mention
// linkifying) - distinct from searchUsers' prefix match, which is unsuited
// to exact-existence checks: a candidate's own username can be starved out
// of an unordered, capped prefix result set by other usernames sharing the
// same prefix. Returns each match's canonical (stored) casing.
const verifyUsernames = async (req, res, next) => {
  try {
    const usernames = (req.query.usernames?.split(",") || [])
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, MAX_VERIFY_USERNAMES);

    if (usernames.length === 0) return res.json({ users: [] });

    const matches = await User.findAll({
      where: { [Op.or]: usernames.map((name) => ({ username: { [Op.iLike]: name } })) },
      attributes: ["username"],
    });

    res.json({ users: matches.map(({ username }) => username) });
  } catch (error) {
    next(error);
  }
};

const DIRECTORY_PAGE_SIZE = 20;

// Paginated list of all users (username, avatar, bio only - no auth
// required, no sensitive fields exposed) for the browsable author
// directory. Distinct from searchUsers (unpaginated prefix match capped
// at 5, built for @mention autocomplete) and verifyUsernames (exact-match
// batch lookup) - this is the only one meant to be paged through in full.
const directory = async (req, res, next) => {
  try {
    const { limit = DIRECTORY_PAGE_SIZE, offset = 0 } = req.query;

    const { rows, count } = await User.findAndCountAll({
      attributes: ["username", "image", "bio"],
      limit: parseInt(limit),
      offset: offset * limit,
      order: [["username", "ASC"]],
    });

    res.json({ users: rows, usersCount: count });
  } catch (error) {
    next(error);
  }
};

module.exports = { signUp, signIn, searchUsers, verifyUsernames, directory };
