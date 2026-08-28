"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Article extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ User, Tag, Comment, Reaction }) {
      // define association here

      // Users
      this.belongsTo(User, { foreignKey: "userId", as: "author" });

      // Comments
      this.hasMany(Comment, { foreignKey: "articleId", onDelete: "cascade" });

      // Tag list
      this.belongsToMany(Tag, {
        through: "TagList",
        as: "tagList",
        foreignKey: "articleId",
        timestamps: false,
        onDelete: "cascade", // FIXME: delete tags
      });

      // Favorites
      this.belongsToMany(User, {
        through: "Favorites",
        foreignKey: "articleId",
        timestamps: false,
      });

      // Read Later (REQ-086/REQ-087/REQ-088): aliased so this does not
      // clash with the unaliased Favorites association above.
      this.belongsToMany(User, {
        through: "ReadLater",
        as: "readLaterUsers",
        foreignKey: "articleId",
      });

      // Reactions (REQ-094/REQ-095/REQ-096): a separate, independent
      // concept from Favorites above - a distinct model/table, never
      // folded into the favorite relation or its count.
      this.hasMany(Reaction, { foreignKey: "articleId", onDelete: "CASCADE" });
    }

    toJSON() {
      return {
        ...this.get(),
        id: undefined,
        userId: undefined,
      };
    }
  }
  Article.init(
    {
      slug: DataTypes.STRING,
      title: DataTypes.STRING,
      description: DataTypes.TEXT,
      body: DataTypes.TEXT,
      published: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      image: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "Article",
    },
  );
  return Article;
};
