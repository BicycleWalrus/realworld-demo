"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "website", {
      type: Sequelize.TEXT,
    });
    await queryInterface.addColumn("Users", "github", {
      type: Sequelize.TEXT,
    });
    await queryInterface.addColumn("Users", "twitter", {
      type: Sequelize.TEXT,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("Users", "website");
    await queryInterface.removeColumn("Users", "github");
    await queryInterface.removeColumn("Users", "twitter");
  },
};
