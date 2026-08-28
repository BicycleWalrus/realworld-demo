const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const { listNotifications, markRead } = require("../controllers/notifications");

//? A user's own notifications (REQ-098)
router.get("/", verifyToken, listNotifications);
//* Mark notifications read (REQ-099)
router.post("/read", verifyToken, markRead);

module.exports = router;
