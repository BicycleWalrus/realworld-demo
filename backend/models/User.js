"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ Article, Comment, User, Tag, Reaction, Notification }) {
      // define association here

      // Articles
      this.hasMany(Article, { foreignKey: "userId", onDelete: "CASCADE" });

      // Comments
      this.hasMany(Comment, { foreignKey: "articleId" });

      // Favorites
      this.belongsToMany(Article, {
        through: "Favorites",
        as: "favorites",
        foreignKey: "userId",
        timestamps: false,
      });

      // Followers
      this.belongsToMany(User, {
        through: "Followers",
        as: "followers",
        foreignKey: "userId",
        timestamps: false,
      });
      this.belongsToMany(User, {
        through: "Followers",
        as: "following",
        foreignKey: "followerId",
        timestamps: false,
      });

      // Read Later (REQ-086/REQ-087/REQ-088): a private, per-user saved-
      // articles list, distinct from Favorites. Timestamps are left on
      // (default) so the join table's createdAt can order the list
      // most-recently-added first.
      this.belongsToMany(Article, {
        through: "ReadLater",
        as: "readLater",
        foreignKey: "userId",
      });

      // Follow Tags (REQ-089): additive to Followers above - a user can
      // follow a Tag as well as another User. Backed by a TagFollows join
      // table, entirely distinct from the article TagList join table
      // (REQ-020/REQ-021), so following a tag never affects which
      // articles carry that tag.
      this.belongsToMany(Tag, {
        through: "TagFollows",
        as: "followedTags",
        foreignKey: "userId",
        timestamps: false,
      });

      // Reactions (REQ-094/REQ-095/REQ-096): a separate, independent
      // concept from Favorites - a user's reactions live in their own
      // table, distinct from the Favorites join above.
      this.hasMany(Reaction, { foreignKey: "userId", onDelete: "CASCADE" });

      // Notifications (REQ-097/REQ-098): a user's own notifications,
      // raised as a side effect of another user's follow/comment/favorite
      // action against them. Foreign key is recipientId (see Notification
      // model) so this association never mixes up recipient vs actor.
      this.hasMany(Notification, { as: "notifications", foreignKey: "recipientId", onDelete: "CASCADE" });
    }

    toJSON() {
      return {
        ...this.get(),
        id: undefined,
        password: undefined,
        updatedAt: undefined,
        createdAt: undefined,
      };
    }
  }
  User.init(
    {
      email: DataTypes.STRING,
      username: DataTypes.STRING,
      bio: DataTypes.TEXT,
      image: DataTypes.TEXT,
      password: DataTypes.STRING,
      // REQ-103/REQ-104: optional social/external links, set via the
      // existing generic partial-update loop in updateUser (REQ-011) -
      // no controller change needed for these to flow through.
      website: DataTypes.TEXT,
      github: DataTypes.TEXT,
      twitter: DataTypes.TEXT,
    },
    {
      sequelize,
      modelName: "User",
    },
  );
  return User;
};
