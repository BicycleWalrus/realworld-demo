"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ Article, Comment, User }) {
      // define association here

      this.belongsTo(User, { as: "recipient", foreignKey: "recipientId" });
      this.belongsTo(User, { as: "actor", foreignKey: "actorId" });
      this.belongsTo(Article, { foreignKey: "articleId" });
      this.belongsTo(Comment, { foreignKey: "commentId" });
    }

    toJSON() {
      return {
        ...this.get(),
        recipientId: undefined,
      };
    }
  }
  Notification.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      type: DataTypes.STRING,
      read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "Notification",
    },
  );
  return Notification;
};
