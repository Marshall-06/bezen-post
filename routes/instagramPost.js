const express = require("express");
const router = express.Router();
const { fetchInstagramPosts } = require("../controllers/instagramPost");
const downloadInstagramPosts = require("../controllers/instagramPost").downloadInstagramPosts;

router.post("/download/:username", downloadInstagramPosts);
router.post("/fetch/:username", fetchInstagramPosts);

module.exports = router;
