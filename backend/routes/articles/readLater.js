const express = require("express");
const router = express.Router();
const verifyToken = require("../../middleware/authentication");
const { readLaterToggler } = require("../../controllers/readLater");

//* Save an article for later
router.post("/:slug/read-later", verifyToken, readLaterToggler);
//* Un-save an article
router.delete("/:slug/read-later", verifyToken, readLaterToggler);

module.exports = router;
