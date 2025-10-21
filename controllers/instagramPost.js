const axios = require("axios");
const Post = require("../models/post"); // adjust path if needed

const fetchInstagramPosts = async (req, res) => {
  const username = req.params.username;

  try {
    const response = await axios.get('https://instagram-scraper21.p.rapidapi.com/api/v1/posts', {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST,
      },
      params: {
        username,
        count: 10, 
      },
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

module.exports = { fetchInstagramPosts };
