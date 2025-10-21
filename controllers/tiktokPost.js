const axios = require("axios");
const Post = require("../models/post"); // Capitalized for consistency

exports.fetchTikTokPosts = async (req, res) => {
  const username = req.params.username.trim().toLowerCase();

  try {
    // Step 1️⃣: Get user info
    const userInfoRes = await axios.get("https://tiktok-scraper7.p.rapidapi.com/user/info", {
      headers: {
        "X-RapidAPI-Key": process.env.TIKTOK_RAPIDAPI_KEY,
        "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
      },
      params: { unique_id: username },
    });

    const user_id = userInfoRes.data?.data?.user?.id;
    if (!user_id) {
      return res.status(404).json({ message: `TikTok user '${username}' not found` });
    }

    // Step 2️⃣: Get posts
    const postsRes = await axios.get("https://tiktok-scraper7.p.rapidapi.com/user/posts", {
      headers: {
        "X-RapidAPI-Key": process.env.TIKTOK_RAPIDAPI_KEY,
        "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
      },
      params: { user_id, count: 10, cursor: 0 },
    });

    // Step 3️⃣: Extract safely
    const videos =
      postsRes.data?.data?.videos ||
      postsRes.data?.data?.aweme_list ||
      postsRes.data?.videos ||
      [];

    // Step 4️⃣: Return mapped data
    res.json({
      platform: "TikTok",
      username,
      user_id,
      post_count: videos.length,
      posts: videos.map((v) => ({
        id: v.id || v.video_id || v.aweme_id || null,
        description: v.desc || v.caption || v.title || "",
        create_time: v.createTime || v.create_time || null,
        play_count:
          v.stats?.playCount ??
          v.statistics?.play_count ??
          v.playCount ??
          null,
        like_count:
          v.stats?.diggCount ??
          v.statistics?.digg_count ??
          v.likeCount ??
          null,
        comment_count:
          v.stats?.commentCount ??
          v.statistics?.comment_count ??
          v.commentCount ??
          null,
        share_count:
          v.stats?.shareCount ??
          v.statistics?.share_count ??
          v.shareCount ??
          null,
        video_url:
          v.video?.playAddr ||
          v.video?.playAddrH265 ||
          v.video?.url ||
          v.videoUrl ||
          v.video?.downloadAddr ||
          null,
        cover:
          v.video?.cover ||
          v.video?.originCover ||
          v.coverr ||
          v.thumbnail ||
          null,
      })),
    });
  } catch (err) {
    console.error("TikTok RapidAPI error:", err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      message: "Failed to fetch TikTok posts",
      error: err.response?.data || err.message,
    });
  }
  // const username = req.params.username;
  
  //   try {
  //     const response = await axios.get('https://tiktok-scraper7.p.rapidapi.com/user/info', {
  //       headers: {
  //         'X-RapidAPI-Key': process.env.TIKTOK_RAPIDAPI_KEY,
  //         'X-RapidAPI-Host': process.env.TIKTOK_RAPIDAPI_HOST,
  //       },
  //       params: {
  //         username,
  //         count: 10, 
  //       },
  //     });
  
  //     res.json(response.data);
  //   } catch (err) {
  //     console.error('RapidAPI error:', err.response?.data || err.message);
  //     res.status(err.response?.status || 500).json({
  //       message: 'Failed to fetch Instagram posts',
  //       error: err.response?.data || err.message,
  //     });
  //   }

};
