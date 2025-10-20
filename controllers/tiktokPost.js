const axios = require("axios");
const Post = require("../models/post"); // Capitalized for consistency

exports.fetchTikTokPosts = async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: "Username required" });
  }

  try {
    // 1️⃣ Fetch TikTok user info
    const userInfoRes = await axios.get(`${process.env.TIKAPI_BASE}/user/info/`, {
      params: { username },
      headers: { "X-API-KEY": process.env.TIKAPI_KEY },
    });

    const secUid = userInfoRes.data?.user?.secUid;
    if (!secUid) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2️⃣ Fetch last 10 TikTok posts
    const postsRes = await axios.get(`${process.env.TIKAPI_BASE}/user/posts/`, {
      params: { secUid, count: 10 },
      headers: { "X-API-KEY": process.env.TIKAPI_KEY },
    });

    const posts = postsRes.data?.items || [];

    // 3️⃣ Save to database (parallelized with Promise.all)
    const saved = await Promise.all(
      posts.map(async (item) => {
        return await Post.create({
          username,
          caption: item.desc || "",
          mediaUrl: item.video?.playAddr || "",
          thumbnail: item.video?.cover || "",
          source: "tiktok",
          postedAt: new Date(item.createTime * 1000),
        });
      })
    );

    res.json({
      message: `${saved.length} TikTok posts saved successfully`,
      posts: saved,
    });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({
      message: "Failed to fetch TikTok posts",
      error: err.response?.data || err.message,
    });
  }
};
