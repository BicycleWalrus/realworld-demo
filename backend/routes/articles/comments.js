const express = require("express");
const router = express.Router();
const verifyToken = require("../../middleware/authentication");
const {
  allComments,
  createComment,
  deleteComment,
  updateComment,
} = require("../../controllers/comments");

//? All Comments for Article
router.get("/:slug/comments", verifyToken, allComments);
//* Create Comment for Article
router.post("/:slug/comments", verifyToken, createComment);
//* Delete Comment for Article
router.delete("/:slug/comments/:commentId", verifyToken, deleteComment);
//* Update Comment for Article
router.put("/:slug/comments/:commentId", verifyToken, updateComment);

module.exports = router;
