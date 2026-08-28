const express = require("express");
const router = express.Router();
const { signUp, signIn, searchUsers } = require("../controllers/users");

// Register
router.post("/", signUp);
// Login
router.post("/login", signIn);
// Search usernames (for @mention autocomplete)
router.get("/search", searchUsers);

module.exports = router;
