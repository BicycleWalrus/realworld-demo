const { UnauthorizedError, ValidationError } = require("../helper/customErrors");
const { bcryptHash } = require("../helper/bcrypt");

const SOCIAL_LINK_FIELDS = ["website", "github", "twitter"];
const isHttpUrl = (value) => /^https?:\/\//i.test(value);

//* Current User
const currentUser = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    loggedUser.dataValues.email = req.headers.email;
    delete req.headers.email;

    res.json({ user: loggedUser });
  } catch (error) {
    next(error);
  }
};

//* Update User
const updateUser = async (req, res, next) => {
  try {
    const { loggedUser } = req;
    if (!loggedUser) throw new UnauthorizedError();

    const {
      user: { password },
      user,
    } = req.body;

    SOCIAL_LINK_FIELDS.forEach((field) => {
      const value = user[field];
      if (value && !isHttpUrl(value)) {
        throw new ValidationError(`${field} must be a valid http(s) URL`);
      }
    });

    Object.entries(user).forEach((entry) => {
      const [key, value] = entry;

      if (value !== undefined && key !== "password") loggedUser[key] = value;
    });

    if (password !== undefined || password !== "") {
      loggedUser.password = await bcryptHash(password);
    }

    await loggedUser.save();

    res.json({ user: loggedUser });
  } catch (error) {
    next(error);
  }
};

module.exports = { currentUser, updateUser };
