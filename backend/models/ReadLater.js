"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class ReadLater extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ User, Article }) {
      // define association here

      this.belongsTo(User, { foreignKey: "userId" });
      this.belongsTo(Article, { foreignKey: "articleId" });
    }
  }
  ReadLater.init(
    {},
    {
      sequelize,
      modelName: "ReadLater",
      indexes: [{ unique: true, fields: ["userId", "articleId"] }],
    },
  );
  return ReadLater;
};
