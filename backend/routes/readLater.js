const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const { readLaterList, readLaterToggler } = require("../controllers/readLater");

//? Read Later list (REQ-087)
router.get("/", verifyToken, readLaterList);
//* Add to Read Later (REQ-086)
router.post("/:slug", verifyToken, readLaterToggler);
//* Remove from Read Later (REQ-086)
router.delete("/:slug", verifyToken, readLaterToggler);

module.exports = router;
