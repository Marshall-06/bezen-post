const express = require("express");
const router = express.Router();
const Post = require("../models/post");
const { fetchTikTokPosts } = require("../controllers/tiktokPost");
const downloadTikTokPosts = require("../controllers/tiktokPost").downloadTikTokPosts

// POST /api/tiktok/fetch
router.post("/fetch/:username", fetchTikTokPosts);
router.post("/download/:username", downloadTikTokPosts)

module.exports =  router;
