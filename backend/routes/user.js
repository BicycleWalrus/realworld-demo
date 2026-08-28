const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/authentication");
const { currentUser, updateUser } = require("../controllers/user");
const { listNotifications, markRead } = require("../controllers/notifications");

//* Current User
router.get("/", verifyToken, currentUser);
//* Update User
router.put("/", verifyToken, updateUser);
//? Current user's notifications
router.get("/notifications", verifyToken, listNotifications);
//* Mark notification(s) as read
router.patch("/notifications/read", verifyToken, markRead);

module.exports = router;
