const axios = require("axios");
const Post = require("../models/post"); // adjust path if needed

// Define the controller function
const fetchInstagramPosts = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: "Username required" });
  }

  try {
    // 1️⃣ Fetch Instagram posts (via RapidAPI)
    const response = await axios.get(`${process.env.INSTAGRAM_BASE}/userposts`, {
      params: { username },
      headers: {
        "X-RapidAPI-Key": process.env.INSTAGRAM_KEY,
        "X-RapidAPI-Host": "instagram-scraper-api2.p.rapidapi.com",
      },
    });

    const posts = response.data?.data?.slice(0, 10) || [];

    // 2️⃣ Save to database
    const saved = await Promise.all(
      posts.map(async (item) => {
        return await Post.create({
          username,
          caption: item.caption || "",
          mediaUrl: item.thumbnail_url || item.display_url,
          thumbnail: item.thumbnail_url || item.display_url,
          source: "instagram",
          postedAt: new Date(item.taken_at_timestamp * 1000),
        });
      })
    );

    res.json({
      message: `${saved.length} Instagram posts saved successfully`,
      posts: saved,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      message: "Failed to fetch Instagram posts",
      error: err.response?.data || err.message,
    });
  }
};

// ✅ Export properly
module.exports = { fetchInstagramPosts };
