const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const { Tag } = require("../models");
const { appendTagList } = require("../helper/helpers");
const { tagFollowToggler, followedTags } = require("../controllers/tagFollows");

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

// REQ-089: the requesting user's followed tag names.
router.get("/followed", verifyToken, followedTags);

// REQ-089: follow/unfollow a tag (requires authentication + existing tag).
router.post("/:name/follow", verifyToken, tagFollowToggler);
router.delete("/:name/follow", verifyToken, tagFollowToggler);

module.exports = router;
