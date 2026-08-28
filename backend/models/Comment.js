"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Comment extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ User, Article, Comment }) {
      // define association here

      // Comments
      this.belongsTo(Article, { foreignKey: "articleId" });
      this.belongsTo(User, { as: "author", foreignKey: "userId" });

      // REQ-082/REQ-083/REQ-084: a top-level comment (parentId null) may
      // have replies (one level of nesting only - see createComment's
      // rejection of replying to a reply). onDelete: "CASCADE" mirrors the
      // FK constraint added in the parentId migration: deleting a comment
      // deletes its replies (REQ-084).
      this.hasMany(Comment, { as: "replies", foreignKey: "parentId", onDelete: "CASCADE" });
      this.belongsTo(Comment, { as: "parent", foreignKey: "parentId" });
    }

    toJSON() {
      return {
        ...this.get(),
        articleId: undefined,
        userId: undefined,
      };
    }
  }
  Comment.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      body: DataTypes.TEXT,
      parentId: DataTypes.INTEGER,
    },
    {
      sequelize,
      modelName: "Comment",
    },
  );
  return Comment;
};
