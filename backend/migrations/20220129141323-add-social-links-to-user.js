"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "website", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("Users", "github", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn("Users", "twitter", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Users", "website");
    await queryInterface.removeColumn("Users", "github");
    await queryInterface.removeColumn("Users", "twitter");
  },
};
