const express = require("express");
const router = express.Router();
const { fetchInstagramPosts } = require("../controllers/instagramPost");

router.post("/fetch", fetchInstagramPosts);

module.exports = router;
