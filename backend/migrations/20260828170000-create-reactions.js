"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("Reactions", {
      articleId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: { model: "Articles", key: "id" },
        onDelete: "CASCADE",
      },
      userId: {
        allowNull: false,
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      type: {
        allowNull: false,
        type: Sequelize.STRING,
      },
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("Reactions");
  },
};
