const express = require("express");
const router = express.Router();
const verifyToken = require("../../middleware/authentication");
const { readLaterToggler } = require("../../controllers/readLater");

//* Save Article for later
router.post("/:slug/readlater", verifyToken, readLaterToggler);
//* Remove Article from read-later list
router.delete("/:slug/readlater", verifyToken, readLaterToggler);

module.exports = router;
