"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Comments", "parentId", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: "Comments", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Comments", "parentId");
  },
};
