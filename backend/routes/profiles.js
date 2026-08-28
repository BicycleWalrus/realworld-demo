const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const { listProfiles, getProfile, followToggler } = require("../controllers/profiles");

//? Profile Directory
router.get("/", verifyToken, listProfiles);

//? Profile
router.get("/:username", verifyToken, getProfile);

//* Follow Profile
router.post("/:username/follow", verifyToken, followToggler);

//* Unfollow Profile
router.delete("/:username/follow", verifyToken, followToggler);

module.exports = router;
