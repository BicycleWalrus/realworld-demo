const express = require("express");
const router = express.Router();
const { signUp, signIn, listUsers } = require("../controllers/users");

// Register
router.post("/", signUp);
// Login
router.post("/login", signIn);
// Directory
router.get("/", listUsers);

module.exports = router;
