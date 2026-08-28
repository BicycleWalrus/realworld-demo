const express = require("express");
const router = express.Router();
const verifyToken = require("../../middleware/authentication");
const { removeReaction, setReaction } = require("../../controllers/reactions");

//* Set or change the viewer's reaction on an article (REQ-066)
router.put("/:slug/reaction", verifyToken, setReaction);
//* Remove the viewer's reaction from an article (REQ-066)
router.delete("/:slug/reaction", verifyToken, removeReaction);

module.exports = router;
