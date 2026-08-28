const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const { getProfile, listProfiles, followToggler } = require("../controllers/profiles");

//? User Directory (REQ-074, REQ-075, REQ-076)
router.get("/", verifyToken, listProfiles);

//? Profile
router.get("/:username", verifyToken, getProfile);

//* Follow Profile
router.post("/:username/follow", verifyToken, followToggler);

//* Unfollow Profile
router.delete("/:username/follow", verifyToken, followToggler);

module.exports = router;
