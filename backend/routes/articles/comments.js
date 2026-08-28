const express = require("express");
const router = express.Router();
const verifyToken = require("../../middleware/authentication");
const {
  allComments,
  createComment,
  updateComment,
  deleteComment,
} = require("../../controllers/comments");

//? All Comments for Article
router.get("/:slug/comments", verifyToken, allComments);
//* Create Comment for Article
router.post("/:slug/comments", verifyToken, createComment);
//* Update Comment for Article
router.put("/:slug/comments/:commentId", verifyToken, updateComment);
//* Delete Comment for Article
router.delete("/:slug/comments/:commentId", verifyToken, deleteComment);

module.exports = router;
