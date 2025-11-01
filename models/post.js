const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Post = sequelize.define("Post", {
  id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    platformPostId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // ensures no duplicate TikTok/Instagram posts
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    caption: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    mediaUrl: {
      type: DataTypes.TEXT, // URLs can be long
      allowNull: true,
    },
    thumbnail: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source: {
      type: DataTypes.ENUM("tiktok", "instagram"),
      allowNull: false,
    },
    postedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

module.exports =  Post;
