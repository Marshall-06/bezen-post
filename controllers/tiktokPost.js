const axios = require("axios");
const Post = require("../models/post"); // Capitalized for consistency
const fs = require("fs");
const path = require("path");
const https = require("https");

const agent = new https.Agent({ rejectUnauthorized: false });

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function downloadFile(url, filePath) {
  const writer = fs.createWriteStream(filePath);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
    httpsAgent: agent,
  });
  return new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
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

//  const username = req.params.username.trim().toLowerCase();
//   const rootFolder = path.join(process.cwd(), "downloads", "tiktok");

//   try {
//     await ensureDir(rootFolder);

//     // Step 1: Get user info
//     const userRes = await axios.get("https://tiktok-scraper7.p.rapidapi.com/user/info", {
//       headers: {
//         "X-RapidAPI-Key": process.env.TIKTOK_RAPIDAPI_KEY,
//         "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
//       },
//       params: { unique_id: username },
//       httpsAgent: agent,
//     });

//     const user_id = userRes.data?.data?.user?.id;
//     if (!user_id) {
//       return res.status(404).json({ message: `TikTok user '${username}' not found.` });
//     }

//     // Step 2: Get posts
//     const postRes = await axios.get("https://tiktok-scraper7.p.rapidapi.com/user/posts", {
//       headers: {
//         "X-RapidAPI-Key": process.env.TIKTOK_RAPIDAPI_KEY,
//         "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
//       },
//       params: { user_id, count: 10 },
//       httpsAgent: agent,
//     });

//     const posts = postRes.data?.data?.videos || postRes.data?.data?.aweme_list || [];
//     if (!Array.isArray(posts) || posts.length === 0) {
//       return res.status(404).json({ message: `No TikTok posts found for '${username}'.` });
//     }

//     const results = [];

//     for (const v of posts.slice(0, 10)) {
//       const postId = v.id || v.aweme_id || v.video_id || Date.now().toString();
//       const folder = path.join(rootFolder, postId);
//       await ensureDir(folder);

//       const videoUrl =
//         v.video?.downloadAddr || v.video?.playAddr || v.video?.url || v.video?.play || null;
//       const imageUrl =
//         v.video?.cover || v.video?.originCover || v.cover || v.thumbnail || null;

//       if (videoUrl) {
//         const videoPath = path.join(folder, `${postId}.mp4`);
//         await downloadFile(videoUrl, videoPath);
//       }

//       if (imageUrl) {
//         const imgPath = path.join(folder, `${postId}.jpg`);
//         await downloadFile(imageUrl, imgPath);
//       }

//       // Save metadata in database
//       const [saved, created] = await Post.findOrCreate({
//         where: { platformPostId: postId },
//         defaults: {
//           username,
//           caption: v.desc || "",
//           mediaUrl: videoUrl || imageUrl || "",
//           thumbnail: imageUrl || null,
//           source: "tiktok",
//           postedAt: new Date((v.createTime || v.create_time || Date.now()) * 1000),
//         },
//       });

//       if (!created) {
//         await saved.update({
//           caption: v.desc || "",
//           mediaUrl: videoUrl || imageUrl || "",
//           thumbnail: imageUrl || null,
//           postedAt: new Date((v.createTime || v.create_time || Date.now()) * 1000),
//         });
//       }

//       results.push({ id: postId, videoUrl, imageUrl, folderPath: folder });
//     }

//     return res.json({
//       platform: "TikTok",
//       username,
//       downloaded: results.length,
//       save_path: rootFolder,
//       posts: results,
//     });
//   } catch (err) {
//     console.error("TikTok Download Error:", err.response?.data || err.message);
//     return res.status(err.response?.status || 500).json({
//       message: "Failed to download TikTok posts",
//       error: err.response?.data || err.message,
//     });
//   }

   const username = req.params.username?.trim().toLowerCase();
  if (!username) {
    return res.status(400).json({ message: "Username is required." });
  }

  const rootFolder = path.join(process.cwd(), "downloads", "tiktok", username);
  await ensureDir(rootFolder);

  try {
    console.log(`📡 Fetching TikTok posts for ${username}...`);

    // Step 1️⃣: Fetch user info to get user_id
    const userRes = await axios.get("https://tiktok-scraper7.p.rapidapi.com/user/info", {
      headers: {
        "X-RapidAPI-Key": process.env.TIKTOK_RAPIDAPI_KEY,
        "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
      },
      params: { unique_id: username },
      httpsAgent: agent,
    });

    const user_id =
      userRes.data?.data?.user?.id ||
      userRes.data?.user?.id ||
      userRes.data?.data?.user_id ||
      null;

    if (!user_id) {
      console.warn("⚠️ TikTok user ID not found:", userRes.data);
      return res.status(404).json({ message: `TikTok user '${username}' not found.` });
    }

    // Step 2️⃣: Fetch recent posts
    const postRes = await axios.get("https://tiktok-scraper7.p.rapidapi.com/user/posts", {
      headers: {
        "X-RapidAPI-Key": process.env.TIKTOK_RAPIDAPI_KEY,
        "X-RapidAPI-Host": "tiktok-scraper7.p.rapidapi.com",
      },
      params: { user_id, count: 10 },
      httpsAgent: agent,
    });

    const posts =
      postRes.data?.data?.videos ||
      postRes.data?.data?.aweme_list ||
      postRes.data?.videos ||
      [];

    if (!Array.isArray(posts) || posts.length === 0) {
      console.warn(`⚠️ No TikTok posts found for ${username}. Response:`, postRes.data);
      return res.status(404).json({ message: `No TikTok posts found for '${username}'.` });
    }

    console.log(`✅ Found ${posts.length} TikTok posts for ${username}`);
    const results = [];

    // Step 3️⃣: Iterate and download
    for (const post of posts.slice(0, 10)) {
      const postId =
        post.id || post.aweme_id || post.video_id || `${Date.now()}`;
      const folder = path.join(rootFolder, postId);
      await ensureDir(folder);

      // Normalize URL fields
      const videoUrl =
        post.video?.downloadAddr ||
        post.video?.playAddr ||
        post.video?.url ||
        post.videoUrl ||
        null;

      const coverUrl =
        post.video?.cover ||
        post.video?.originCover ||
        post.video?.dynamicCover ||
        post.cover ||
        null;

      if (!videoUrl && !coverUrl) {
        console.warn(`⚠️ No media URL found for post ${postId}`);
        continue;
      }

      // Download media
      if (videoUrl) {
        const videoPath = path.join(folder, `${postId}.mp4`);
        await downloadFile(videoUrl, videoPath);
        console.log(`🎥 Downloaded video for ${postId}`);
      }

      if (coverUrl) {
        const imagePath = path.join(folder, `${postId}.jpg`);
        await downloadFile(coverUrl, imagePath);
        console.log(`🖼️ Downloaded thumbnail for ${postId}`);
      }

      // Normalize caption
      const caption =
        post.desc || post.caption || post.title || post.text || "";

      // Step 4️⃣: Save post to DB
      const [saved, created] = await Post.findOrCreate({
        where: { platformPostId: postId },
        defaults: {
          username,
          caption,
          mediaUrl: videoUrl || "",
          thumbnail: coverUrl || "",
          source: "tiktok",
          postedAt: new Date((post.createTime || post.create_time) * 1000 || Date.now()),
        },
      });

      if (!created) {
        await saved.update({
          caption,
          mediaUrl: videoUrl || "",
          thumbnail: coverUrl || "",
          postedAt: new Date((post.createTime || post.create_time) * 1000 || Date.now()),
        });
      }

      results.push({
        id: postId,
        videoUrl,
        coverUrl,
        folderPath: folder,
      });
    }

    // Step 5️⃣: Response
    return res.json({
      platform: "TikTok",
      username,
      downloaded: results.length,
      save_path: rootFolder,
      posts: results,
    });
  } catch (err) {
    console.error("❌ TikTok Download Error:", err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({
      message: "Failed to download TikTok posts",
      error: err.response?.data || err.message,
    });
  }
};
