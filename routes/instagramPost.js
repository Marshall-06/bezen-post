const express = require("express");
const router = express.Router();
const { fetchInstagramPosts } = require("../controllers/instagramPost");

router.post("/fetch/:username", fetchInstagramPosts);

module.exports = router;
