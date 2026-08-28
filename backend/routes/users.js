const express = require("express");
const router = express.Router();
const { signUp, signIn, searchUsers, verifyUsernames, directory } = require("../controllers/users");

// Register
router.post("/", signUp);
// Login
router.post("/login", signIn);
// Search usernames (@mention autocomplete)
router.get("/", searchUsers);
// Verify which of a batch of exact usernames exist (@mention linkifying)
router.get("/verify", verifyUsernames);
// Paginated author directory
router.get("/directory", directory);

module.exports = router;
