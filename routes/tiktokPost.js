const express = require("express");
const router = express.Router();
const { fetchTikTokPosts } = require("../controllers/tiktokPost");

// POST /api/tiktok/fetch
router.post("/fetch", fetchTikTokPosts);

module.exports =  router;
