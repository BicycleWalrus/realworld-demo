const express = require("express");
const router = express.Router();
const verifyToken = require("../../middleware/authentication");
const { readLaterToggler } = require("../../controllers/readLater");

//* Save Article for later
router.post("/:slug/read-later", verifyToken, readLaterToggler);
//* Unsave Article
router.delete("/:slug/read-later", verifyToken, readLaterToggler);

module.exports = router;
