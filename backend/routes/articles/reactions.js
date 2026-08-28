const express = require("express");
const router = express.Router();
const verifyToken = require("../../middleware/authentication");
const { reactionToggler } = require("../../controllers/reactions");

//* Set/Change Reaction
router.post("/:slug/reactions", verifyToken, reactionToggler);
//* Remove Reaction
router.delete("/:slug/reactions", verifyToken, reactionToggler);

module.exports = router;
