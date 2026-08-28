"use strict";
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("Articles", "draft", {
      allowNull: false,
      defaultValue: false,
      type: Sequelize.BOOLEAN,
    });
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("Articles", "draft");
  },
};
