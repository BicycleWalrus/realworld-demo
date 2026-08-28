const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const { allTags, tagFollowToggler } = require("../controllers/tags");

//? All Tags
router.get("/", verifyToken, allTags);
//* Follow Tag
router.post("/:name/follow", verifyToken, tagFollowToggler);
//* Unfollow Tag
router.delete("/:name/follow", verifyToken, tagFollowToggler);

module.exports = router;
