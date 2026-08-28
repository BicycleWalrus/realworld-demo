const express = require("express");
const router = express.Router();
const verifyToken = require("../../middleware/authentication");
const { reactionToggler } = require("../../controllers/reactions");

//* Set/Change Reaction on Article
router.post("/:slug/reactions", verifyToken, reactionToggler);
//* Remove Reaction on Article
router.delete("/:slug/reactions", verifyToken, reactionToggler);

module.exports = router;
