"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Reaction extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ Article, User }) {
      // define association here

      // REQ-094/REQ-096: a reaction is independent of Favorites - separate
      // model/table entirely, joined the same way (belongsTo Article/User).
      this.belongsTo(Article, { foreignKey: "articleId" });
      this.belongsTo(User, { as: "user", foreignKey: "userId" });
    }

    toJSON() {
      return {
        ...this.get(),
        articleId: undefined,
        userId: undefined,
      };
    }
  }
  Reaction.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      type: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Reaction",
    },
  );
  return Reaction;
};
