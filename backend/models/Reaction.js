"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Reaction extends Model {
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
  Reaction.init(
    {
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Reaction",
      indexes: [{ unique: true, fields: ["userId", "articleId"] }],
    },
  );
  return Reaction;
};
