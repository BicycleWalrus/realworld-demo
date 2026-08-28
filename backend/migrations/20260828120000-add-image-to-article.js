"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Articles", "image", {
      type: Sequelize.TEXT,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("Articles", "image");
  },
};
