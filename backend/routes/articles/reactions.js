const express = require("express");
const router = express.Router();
const verifyToken = require("../../middleware/authentication");
const { setReaction, removeReaction } = require("../../controllers/reactions");

//* Set/change a reaction
router.put("/:slug/reactions", verifyToken, setReaction);
//* Remove a reaction
router.delete("/:slug/reactions", verifyToken, removeReaction);

module.exports = router;
