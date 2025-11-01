const axios = require("axios");
const Post = require("../models/post"); // adjust path if needed
const fs = require("fs");
const path = require("path");
const https = require("https");
const { mkdir } = require("fs").promises;


const agent = new https.Agent({ rejectUnauthorized: false }); // handles some TLS cases

async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
  });
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

const username = req.params.username.trim().toLowerCase();
  const rootFolder = path.join(process.cwd(), "downloads", "instagram");

  try {
    await ensureDir(rootFolder);

    // Step 1️⃣: Try main endpoint format
    let response;
    const baseURL = "https://instagram-scraper21.p.rapidapi.com/api/v1/posts";
    try {
      response = await axios.get(baseURL, {
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "instagram-scraper21.p.rapidapi.com",
        },
        params: { username_or_id_or_url: username },
        httpsAgent: agent,
      });
    } catch (err) {
      // Step 2️⃣: Fallback to path format if API expects /posts/{username}
      if (err.response?.data?.message?.includes("username is required")) {
        const altURL = `${baseURL}/${username}`;
        response = await axios.get(altURL, {
          headers: {
            "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
            "X-RapidAPI-Host": "instagram-scraper21.p.rapidapi.com",
          },
          httpsAgent: agent,
        });
      } else {
        throw err;
      }
    }

    console.log("Full API response:", JSON.stringify(response.data, null, 2));

    // Step 3️⃣: Extract post data
    const posts =
      response.data?.data?.posts ||
      response.data?.result ||
      response.data?.data?.items ||
      [];

    if (!Array.isArray(posts) || posts.length === 0) {
      console.warn(`⚠️ No posts found in API for '${username}'`);
      return res
        .status(404)
        .json({ message: `No Instagram posts found for '${username}'.` });
    }

    console.log(`Found ${posts.length} posts for ${username}`);

    const results = [];

    // Step 4️⃣: Process and store up to 10 posts
    for (const post of posts.slice(0, 10)) {
      const postId =
        post.id || post.pk || post.code || post.shortcode || Date.now().toString();
      const folder = path.join(rootFolder, postId);
      await ensureDir(folder);

      const imageUrl =
        post.image_versions2?.candidates?.[0]?.url ||
        post.thumbnail_url ||
        post.display_url ||
        post.image ||
        null;

      const videoUrl =
        post.video_versions?.[0]?.url ||
        post.video ||
        post.video_url ||
        null;

      // Step 5️⃣: Download media files
      if (imageUrl) {
        const imgPath = path.join(folder, `${postId}.jpg`);
        await downloadFile(imageUrl, imgPath);
      }

      if (videoUrl) {
        const videoPath = path.join(folder, `${postId}.mp4`);
        await downloadFile(videoUrl, videoPath);
      }

      // Step 6️⃣: Save or update database record
      const [saved, created] = await Post.findOrCreate({
        where: { platformPostId: postId },
        defaults: {
          username,
          caption: post.caption?.text || post.caption || "",
          mediaUrl: videoUrl || imageUrl || "",
          thumbnail: imageUrl || null,
          source: "instagram",
          postedAt: new Date(
            (post.taken_at_timestamp || post.taken_at || post.created_at) * 1000 ||
              Date.now()
          ),
        },
      });

      if (!created) {
        await saved.update({
          caption: post.caption?.text || post.caption || "",
          mediaUrl: videoUrl || imageUrl || "",
          thumbnail: imageUrl || null,
          postedAt: new Date(
            (post.taken_at_timestamp || post.taken_at || post.created_at) * 1000 ||
              Date.now()
          ),
        });
      }

      results.push({ id: postId, imageUrl, videoUrl, folderPath: folder });
    }

    // Step 7️⃣: Return final response
    return res.json({
      platform: "Instagram",
      username,
      downloaded: results.length,
      save_path: rootFolder,
      posts: results,
    });
  } catch (err) {
    console.error("Instagram Download Error:", err.response?.data || err.message);
    return res.status(err.response?.status || 500).json({
      message: "Failed to download Instagram posts",
      error: err.response?.data || err.message,
    });
  }
}


module.exports = { fetchInstagramPosts, downloadInstagramPosts };
