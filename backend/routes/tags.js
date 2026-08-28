const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const { Tag } = require("../models");
const { appendTagList } = require("../helper/helpers");
const { followTag, getTag, unfollowTag } = require("../controllers/tagFollows");

// All Tags
router.get("/", async (req, res, next) => {
  try {
    const tagList = await Tag.findAll();

    const tags = appendTagList(tagList);

    res.json({ tags });
  } catch (error) {
    next(error);
  }
});

//? Single tag with viewer follow state (REQ-065)
router.get("/:name", verifyToken, getTag);
//? Follow a tag (REQ-065)
router.post("/:name/follow", verifyToken, followTag);
//? Unfollow a tag (REQ-065)
router.delete("/:name/follow", verifyToken, unfollowTag);

module.exports = router;
