const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const { readLaterList } = require("../controllers/readLater");

//? Current user's read-later list
router.get("/", verifyToken, readLaterList);

module.exports = router;
