"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Articles", "published", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("Articles", "published");
  },
};
