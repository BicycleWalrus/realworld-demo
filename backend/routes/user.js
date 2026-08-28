const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const { currentUser, updateUser } = require("../controllers/user");
const { readingList } = require("../controllers/readLater");

//* Current User
router.get("/", verifyToken, currentUser);
//* Update User
router.put("/", verifyToken, updateUser);
//? Current user's read-later list
router.get("/readlater", verifyToken, readingList);

module.exports = router;
