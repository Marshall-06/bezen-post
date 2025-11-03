const axios = require("axios");
const Post = require("../models/post"); // adjust path if needed
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

/**
 * Updated media URL extractor for instagram120 API
 */
function extractMediaUrls(node) {
  const urls = new Set();

  if (!node) return [];

  // Primary display URL
  if (node.display_url) urls.add(node.display_url);
  if (node.thumbnail_src) urls.add(node.thumbnail_src);

  // For videos
  if (node.is_video && node.video_url) urls.add(node.video_url);

  // Alternative image sets
  if (node.image_versions2?.candidates?.length) {
    node.image_versions2.candidates.forEach((c) => c.url && urls.add(c.url));
  }

  // For carousels
  if (Array.isArray(node.carousel_media)) {
    node.carousel_media.forEach((item) => {
      if (item.image_versions2?.candidates?.length) {
        item.image_versions2.candidates.forEach((c) => c.url && urls.add(c.url));
      }
      if (item.video_versions?.length) {
        item.video_versions.forEach((v) => v.url && urls.add(v.url));
      }
    });
  }

  // Deep fallback: display_resources array
  if (Array.isArray(node.display_resources)) {
    node.display_resources.forEach((r) => r.src && urls.add(r.src));
  }

  return Array.from(urls);
}

const fetchInstagramPosts = async (req, res) => {
  const username = req.params.username;

  try {
    const response = await axios.get("https://instagram-scraper21.p.rapidapi.com/api/v1/posts", {
      headers: {
        "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
        "X-RapidAPI-Host": "instagram-scraper21.p.rapidapi.com",
      },
      params: { username, count: 10 }
    });

    res.json(response.data);
  } catch (err) {
    console.error('RapidAPI error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({
      message: 'Failed to fetch Instagram posts',
      error: err.response?.data || err.message,
    });
  }
};


const downloadInstagramPosts = async (req, res) => {
  // const username = req.params.username.trim().toLowerCase();

  // try {
  //   // Step 1: Request Instagram posts from RapidAPI
  //   const response = await axios.get("https://instagram-scraper21.p.rapidapi.com/api/v1/posts", {
  //     headers: {
  //       "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
  //       "X-RapidAPI-Host": process.env.RAPIDAPI_HOST,
  //     },
  //     params: { username, count: 10 },
  //   });

  //   // Step 2: Extract posts safely
  //   const posts =
  //     response.data?.data?.items ||
  //     response.data?.result ||
  //     response.data?.data ||
  //     [];

  //   if (!posts.length) {
  //     return res.status(404).json({ message: "No Instagram posts found" });
  //   }

  //   // Step 3: Map post data
  //   const downloadList = posts.slice(0, 10).map((item) => ({
  //     platformPostId: item.id || "",
  //     caption: item.caption?.text || "",
  //     mediaUrl:
  //       item.image_versions2?.candidates?.[0]?.url ||
  //       item.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url ||
  //       "",
  //     thumbnail:
  //       item.image_versions2?.candidates?.[0]?.url ||
  //       item.carousel_media?.[0]?.image_versions2?.candidates?.[0]?.url ||
  //       "",
  //     source: "instagram",
  //     postedAt: new Date(item.taken_at * 1000),
  //   }));

  //   // Step 4: Save posts in MySQL using Sequelize
  //   for (const postData of downloadList) {
  //     if (!postData.platformPostId) continue;

  //     const [post, created] = await Post.findOrCreate({
  //       where: { platformPostId: postData.platformPostId },
  //       defaults: {
  //         username,
  //         caption: postData.caption,
  //         mediaUrl: postData.mediaUrl,
  //         thumbnail: postData.thumbnail,
  //         source: "instagram",
  //         postedAt: postData.postedAt,
  //       },
  //     });

  //     if (!created) {
  //       await post.update({
  //         caption: postData.caption,
  //         mediaUrl: postData.mediaUrl,
  //         thumbnail: postData.thumbnail,
  //         postedAt: postData.postedAt,
  //       });
  //     }
  //   }

  //   // Step 5: Return result
  //   res.json({
  //     username,
  //     total: downloadList.length,
  //     downloads: downloadList,
  //   });
  // } catch (err) {
  //   console.error("Instagram Download API Error:", err.response?.data || err.message);
  //   res.status(err.response?.status || 500).json({
  //     message: "Failed to download Instagram posts",
  //     error: err.response?.data || err.message,
  //   });
  // }

const username = req.params.username?.trim().toLowerCase();
  if (!username) {
    return res.status(400).json({ message: "Username is required." });
  }

  const rootFolder = path.join(process.cwd(), "downloads", "instagram", username);
  await ensureDir(rootFolder);

  try {
    console.log(`📡 Fetching posts for ${username}...`);

    const response = await axios.post(
      "https://instagram120.p.rapidapi.com/api/instagram/posts",
      { username },
      {
        headers: {
          "x-rapidapi-key": process.env.RAPIDAPI_KEY,
          "x-rapidapi-host": "instagram120.p.rapidapi.com",
          "Content-Type": "application/json",
        },
        httpsAgent: agent,
      }
    );

    const data = response.data;
    if (!data?.result?.edges || !Array.isArray(data.result.edges)) {
      console.error("⚠️ Unexpected Instagram API format:", data);
      return res.status(500).json({
        message: "Unexpected response from Instagram API",
        error: data,
      });
    }

    const posts = data.result.edges.map((edge) => edge.node);
    console.log(`✅ Found ${posts.length} posts for ${username}`);

    const results = [];

    for (const post of posts.slice(0, 10)) {
      const postId = post.id || `${Date.now()}`;
      const folder = path.join(rootFolder, postId);
      await ensureDir(folder);

      const urls = extractMediaUrls(post);
      if (!urls.length) {
        console.warn(`⚠️ No media URL for post ${postId}`);
        continue;
      }

      const mediaUrl = urls[0]; // Choose first available URL
      const fileExt = mediaUrl.includes(".mp4") ? ".mp4" : ".jpg";
      const filePath = path.join(folder, `${postId}${fileExt}`);
      await downloadFile(mediaUrl, filePath);
      console.log(`✅ Downloaded ${fileExt.toUpperCase()} for ${postId}`);

      // Normalize caption text
      let caption = "";
      if (Array.isArray(post.edge_media_to_caption?.edges)) {
        caption = post.edge_media_to_caption.edges
          .map((e) => e.node?.text)
          .filter(Boolean)
          .join(" ");
      } else if (typeof post.caption === "string") {
        caption = post.caption;
      } else if (typeof post.caption === "object" && post.caption?.text) {
        caption = post.caption.text;
      }
      caption = String(caption || "").trim();

      // Save to database
      const [saved, created] = await Post.findOrCreate({
        where: { platformPostId: postId },
        defaults: {
          username,
          caption,
          mediaUrl,
          thumbnail: mediaUrl,
          source: "instagram",
          postedAt: new Date(post.taken_at_timestamp * 1000 || Date.now()),
        },
      });

      if (!created) {
        await saved.update({
          caption,
          mediaUrl,
          thumbnail: mediaUrl,
          postedAt: new Date(post.taken_at_timestamp * 1000 || Date.now()),
        });
      }

      results.push({ id: postId, mediaUrl, folderPath: folder });
    }

    return res.json({
      platform: "Instagram",
      username,
      downloaded: results.length,
      save_path: rootFolder,
      posts: results,
    });
  } catch (err) {
    console.error("❌ Instagram Download Error:", err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({
      message: "Failed to download Instagram posts",
      error: err.response?.data || err.message,
    });
  }
}


module.exports = { fetchInstagramPosts, downloadInstagramPosts };
