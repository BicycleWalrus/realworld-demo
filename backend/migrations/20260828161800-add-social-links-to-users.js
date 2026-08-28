"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Users", "websiteUrl", {
      type: Sequelize.TEXT,
      defaultValue: null,
    });
    await queryInterface.addColumn("Users", "githubUrl", {
      type: Sequelize.TEXT,
      defaultValue: null,
    });
    await queryInterface.addColumn("Users", "twitterUrl", {
      type: Sequelize.TEXT,
      defaultValue: null,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Users", "twitterUrl");
    await queryInterface.removeColumn("Users", "githubUrl");
    await queryInterface.removeColumn("Users", "websiteUrl");
  },
};
