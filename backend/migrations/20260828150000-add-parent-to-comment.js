"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Comments", "parentCommentId", {
      type: Sequelize.INTEGER,
    });
    // Named to match the table's existing FK convention (e.g.
    // Comments_articleId_fkey). ON DELETE CASCADE implements REQ-064:
    // deleting a comment deletes its replies with it.
    await queryInterface.addConstraint("Comments", {
      fields: ["parentCommentId"],
      type: "foreign key",
      name: "Comments_parentCommentId_fkey",
      references: { table: "Comments", field: "id" },
      onDelete: "CASCADE",
    });
  },
  async down(queryInterface) {
    await queryInterface.removeConstraint(
      "Comments",
      "Comments_parentCommentId_fkey",
    );
    await queryInterface.removeColumn("Comments", "parentCommentId");
  },
};
