const axios = require("axios");
const Post = require("../models/post"); // Capitalized for consistency
const fs = require("fs");
const path = require("path");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false }); // handles some TLS cases

async function downloadFile(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios.get(url, { responseType: "stream", httpsAgent: agent });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

async function ensureDir(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

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
          v.cover ||
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
};


exports.downloadTikTokPosts = async (req, res) => {
  // const username = req.params.username.trim().toLowerCase();

  // try {
  //   // Step 1: Fetch user info
  //   const userInfo = await axios.get("https://tiktok-scraper7.p.rapidapi.com/user/info", {
  //     headers: {
  //       "X-RapidAPI-Key": process.env.TIKTOK_RAPIDAPI_KEY,
  //       "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
  //     },
  //     params: { unique_id: username },
  //   });

  //   const user_id = userInfo.data?.data?.user?.id;
  //   if (!user_id) {
  //     return res.status(404).json({ message: "TikTok user not found" });
  //   }

  //   // Step 2: Fetch user posts
  //   const postsRes = await axios.get("https://tiktok-scraper7.p.rapidapi.com/user/posts", {
  //     headers: {
  //       "X-RapidAPI-Key": process.env.TIKTOK_RAPIDAPI_KEY,
  //       "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
  //     },
  //     params: { user_id, count: 10, cursor: 0 },
  //   });

  //   const videos = postsRes.data?.data?.videos || postsRes.data?.data?.aweme_list || [];

  //   // Step 3: Map and normalize post data
  //   const downloadList = videos.slice(0, 10).map((v) => ({
  //     platformPostId: v.id || v.video_id || v.aweme_id || null,
  //     caption: v.desc || v.caption || "",
  //     mediaUrl:
  //       v.video?.downloadAddr ||
  //       v.video?.playAddr ||
  //       v.video?.url ||
  //       v.video?.play ||
  //       "",
  //     thumbnail:
  //       v.video?.cover ||
  //       v.video?.originCover ||
  //       v.cover ||
  //       "",
  //     source: "tiktok",
  //     postedAt: new Date((v.createTime || v.create_time) * 1000),
  //   }));

  //   // Step 4: Save posts in MySQL using Sequelize
  //   for (const vid of downloadList) {
  //     if (!vid.platformPostId) continue;

  //     const [post, created] = await Post.findOrCreate({
  //       where: { platformPostId: vid.platformPostId },
  //       defaults: {
  //         username,
  //         caption: vid.caption,
  //         mediaUrl: vid.mediaUrl,
  //         thumbnail: vid.thumbnail,
  //         source: "tiktok",
  //         postedAt: vid.postedAt,
  //       },
  //     });

  //     if (!created) {
  //       await post.update({
  //         caption: vid.caption,
  //         mediaUrl: vid.mediaUrl,
  //         thumbnail: vid.thumbnail,
  //         postedAt: vid.postedAt,
  //       });
  //     }
  //   }

  //   // Step 5: Return response
  //   res.json({
  //     username,
  //     total: downloadList.length,
  //     downloads: downloadList,
  //   });
  // } catch (err) {
  //   console.error("TikTok Download API Error:", err.response?.data || err.message);
  //   res.status(err.response?.status || 500).json({
  //     message: "Failed to download TikTok posts",
  //     error: err.response?.data || err.message,
  //   });
  // }
 const username = req.params.username.trim().toLowerCase();
  const rootFolder = path.join(process.cwd(), "downloads", "tiktok");

  try {
    await ensureDir(rootFolder);

    // Step 1: Get user info
    const userRes = await axios.get("https://tiktok-scraper7.p.rapidapi.com/user/info", {
      headers: {
        "X-RapidAPI-Key": process.env.TIKTOK_RAPIDAPI_KEY,
        "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
      },
      params: { unique_id: username },
      httpsAgent: agent,
    });

    const user_id = userRes.data?.data?.user?.id;
    if (!user_id) {
      return res.status(404).json({ message: `TikTok user '${username}' not found.` });
    }

    // Step 2: Get posts
    const postRes = await axios.get("https://tiktok-scraper7.p.rapidapi.com/user/posts", {
      headers: {
        "X-RapidAPI-Key": process.env.TIKTOK_RAPIDAPI_KEY,
        "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
      },
      params: { user_id, count: 10 },
      httpsAgent: agent,
    });

    const posts = postRes.data?.data?.videos || postRes.data?.data?.aweme_list || [];
    if (!Array.isArray(posts) || posts.length === 0) {
      return res.status(404).json({ message: `No TikTok posts found for '${username}'.` });
    }

    const results = [];

    for (const v of posts.slice(0, 10)) {
      const postId = v.id || v.aweme_id || v.video_id || Date.now().toString();
      const folder = path.join(rootFolder, postId);
      await ensureDir(folder);

      const videoUrl =
        v.video?.downloadAddr || v.video?.playAddr || v.video?.url || v.video?.play || null;
      const imageUrl =
        v.video?.cover || v.video?.originCover || v.cover || v.thumbnail || null;

      if (videoUrl) {
        const videoPath = path.join(folder, `${postId}.mp4`);
        await downloadFile(videoUrl, videoPath);
      }

      if (imageUrl) {
        const imgPath = path.join(folder, `${postId}.jpg`);
        await downloadFile(imageUrl, imgPath);
      }

      // Save metadata in database
      const [saved, created] = await Post.findOrCreate({
        where: { platformPostId: postId },
        defaults: {
          username,
          caption: v.desc || "",
          mediaUrl: videoUrl || imageUrl || "",
          thumbnail: imageUrl || null,
          source: "tiktok",
          postedAt: new Date((v.createTime || v.create_time || Date.now()) * 1000),
        },
      });

      if (!created) {
        await saved.update({
          caption: v.desc || "",
          mediaUrl: videoUrl || imageUrl || "",
          thumbnail: imageUrl || null,
          postedAt: new Date((v.createTime || v.create_time || Date.now()) * 1000),
        });
      }

      results.push({ id: postId, videoUrl, imageUrl, folderPath: folder });
    }

    return res.json({
      platform: "TikTok",
      username,
      downloaded: results.length,
      save_path: rootFolder,
      posts: results,
    });
  } catch (err) {
    console.error("TikTok Download Error:", err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({
      message: "Failed to download TikTok posts",
      error: err.response?.data || err.message,
    });
  }
};
