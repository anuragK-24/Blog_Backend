const router = require("express").Router();
const validator = require("validator");
const User = require("../models/User");
const Post = require("../models/Post");
const verifyToken = require("../middleware/verifyToken");
const redisClient = require("../config/redisClient"); // Redis client

// Redis helpers
const setCache = async (key, data, ttl = 60) => {
  await redisClient.set(key, JSON.stringify(data), { EX: ttl });
};
const getCache = async (key) => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

// Get a user's post stats (cached)
router.get("/:id/stats", async (req, res) => {
  const cacheKey = `userStats:${req.params.id}`;
  try {
    const cachedStats = await getCache(cacheKey);
    if (cachedStats) return res.status(200).json(cachedStats);

    const posts = await Post.find({ userId: req.params.id }).select("title createdAt views");
    await setCache(cacheKey, posts, 60);

    res.status(200).json(posts);
  } catch (err) {
    console.error("Failed to fetch user's posts:", err);
    res.status(500).json("Server error while fetching posts");
  }
});

// Update user profile (invalidate cache)
router.put("/:id", verifyToken, async (req, res) => {
  if (req.user.id !== req.params.id) {
    return res.status(403).json("You can update only your account.");
  }

  try {
    const updates = {};
    const { username, email, techSkills, photo, about, github, linkedin, website, twitter, instagram, youtube } = req.body;

    if (username) {
      if (typeof username !== "string" || username.trim().length < 3) {
        return res.status(400).json("Username must be at least 3 characters long.");
      }
      updates.username = username.trim();
    }

    if (email) {
      if (!validator.isEmail(email)) return res.status(400).json("Invalid email format.");
      updates.email = email.toLowerCase();
    }

    if (techSkills !== undefined) {
      if (!Array.isArray(techSkills)) return res.status(400).json("Tech skills must be an array.");
      updates.techSkills = techSkills;
    }

    if (photo !== undefined) updates.photo = photo;
    if (about !== undefined) updates.about = about;

    const links = { github, linkedin, website, twitter, instagram, youtube };
    for (const [key, value] of Object.entries(links)) {
      if (value && !validator.isURL(value, { protocols: ["http", "https"], require_protocol: true })) {
        return res.status(400).json(`Invalid URL format for ${key}`);
      }
      if (value) updates[key] = value;
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });

    // Invalidate cache
    await redisClient.del(`user:${req.params.id}`);
    await redisClient.del(`userStats:${req.params.id}`);

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("User update failed:", err);
    res.status(500).json("Server error while updating user");
  }
});

// Delete user (invalidate cache)
router.delete("/:id", verifyToken, async (req, res) => {
  if (req.user.id !== req.params.id) return res.status(403).json("You can delete only your account.");

  try {
    await Post.deleteMany({ userId: req.params.id });
    await User.findByIdAndDelete(req.params.id);

    // Invalidate cache
    await redisClient.del(`user:${req.params.id}`);
    await redisClient.del(`userStats:${req.params.id}`);

    res.status(200).json("User and their posts have been deleted.");
  } catch (error) {
    console.error("Delete failed:", error);
    res.status(500).json("Server error while deleting user");
  }
});

// Get user profile (cached)
router.get("/:id", async (req, res) => {
  const cacheKey = `user:${req.params.id}`;
  try {
    const cachedUser = await getCache(cacheKey);
    if (cachedUser) return res.status(200).json(cachedUser);

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json("User not found");

    const { password, ...others } = user._doc;
    await setCache(cacheKey, others, 60);

    res.status(200).json(others);
  } catch (error) {
    res.status(500).json("Server error");
  }
});

module.exports = router;
