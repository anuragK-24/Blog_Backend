const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const verifyCronJob = require("../middleware/verifyCronJob");
const Post = require("../models/Post");
const User = require("../models/User");
const redisClient = require("../config/redisClient"); // Redis client

// Redis helpers
const setCache = async (key, data, ttl = 60) => {
  await redisClient.set(key, JSON.stringify(data), { EX: ttl });
};
const getCache = async (key) => {
  const data = await redisClient.get(key);
  return data ? JSON.parse(data) : null;
};

// GET top post (cached)
router.get("/top", async (req, res) => {
  const cacheKey = "topPost";

  try {
    const cachedPost = await getCache(cacheKey);
    if (cachedPost) return res.status(200).json(cachedPost);

    const post = await Post.findOne()
      .sort({ views: -1 })
      .limit(1)
      .select("_id title photo userId")
      .populate("userId", "username");

    if (!post) return res.status(404).json({ message: "No posts found" });

    const postData = {
      postId: post._id,
      postName: post.title,
      postPhoto: post.photo,
      datePublished: post.createdAt,
      authorName: post.userId?.username || "Unknown",
    };

    await setCache(cacheKey, postData, 60);
    res.status(200).json(postData);
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

// Cleanup route
router.delete("/cleanup", verifyCronJob, async (req, res) => {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const result = await Post.deleteMany({
      $and: [
        { $expr: { $lte: [{ $strLenCP: "$desc" }, 150] } },
        { createdAt: { $lte: oneDayAgo } },
      ],
    });

    res.status(200).json({
      message: `Cleanup complete. ${result.deletedCount} post(s) removed.`,
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
    res.status(500).json({ message: "Internal server error during cleanup" });
  }
});

// Create post
router.post("/", verifyToken, async (req, res) => {
  const { title, desc, photo, userId } = req.body;
  if (!title || !desc || !userId) {
    return res
      .status(400)
      .json({ message: "Title, description, and userId are required." });
  }

  const newPost = new Post({ title, desc, photo, userId });

  try {
    const savedPost = await newPost.save();
    res.status(200).json(savedPost);
  } catch (error) {
    res.status(500).json({ message: "Failed to save post", error });
  }
});

// Update post
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.userId.toString() !== req.body.userId) {
      return res.status(401).json("You can update only your post.");
    }

    const { title, desc, photo } = req.body;
    if (!title || !desc)
      return res.status(400).json("Title and description are required.");

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { $set: { title, desc, photo } },
      { new: true }
    );

    // Invalidate caches
    await redisClient.del("topPost");
    await redisClient.del(`post:${req.params.id}`);
    await redisClient.delPattern("posts:*"); // optional for list caching

    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json(error);
  }
});
 
// Delete post
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.userId.toString() !== req.body.userId) {
      return res.status(401).json("You can delete only your post.");
    }

    await post.delete();

    // Invalidate caches
    await redisClient.del("topPost");
    await redisClient.del(`post:${req.params.id}`);
    await redisClient.delPattern("posts:*");

    res.status(200).json("Post has been deleted");
  } catch (error) {
    res.status(500).json(error);
  }
});

// Get single post (cached)
router.get("/:id", async (req, res) => {
  const postId = req.params.id;
  const cacheKey = `post:${postId}`;
  try {
    const cachedPost = await getCache(cacheKey);
    if (cachedPost) return res.status(200).json(cachedPost);

    const { userId: viewerId } = req.query;
    const post = await Post.findById(postId).populate(
      "userId",
      "username email photo github linkedin website twitter instagram youtube"
    );
    if (!post) return res.status(404).json({ message: "Post not found" });

    const authorId = String(post.userId?._id);
    if (viewerId === undefined || viewerId !== authorId) {
      post.views = (post.views || 0) + 1;
      await post.save();
    }

    const postWithAuthor = {
      ...post._doc,
      author: post.userId || { username: "Unknown" },
    };

    await setCache(cacheKey, postWithAuthor, 60);
    res.status(200).json(postWithAuthor);
  } catch (error) {
    console.error("Error in GET /:id", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Search posts (cached)
router.get("/search/:query", async (req, res) => {
  const searchQuery = req.params.query;
  const limit = 4;
  const cacheKey = `search:${searchQuery}`;

  try {
    const cachedSearch = await getCache(cacheKey);
    if (cachedSearch) return res.status(200).json(cachedSearch);

    if (!searchQuery)
      return res.status(400).json({ message: "Search query is required" });

    const posts = await Post.find({
      title: { $regex: searchQuery, $options: "i" },
    })
      .select("title")
      .limit(limit);

    await setCache(cacheKey, posts, 60);
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json(error);
  }
});

// Get all posts (cached)
router.get("/", async (req, res) => {
  const userId = req.query.userId;
  const catName = req.query.cat;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 3;
  const skip = (page - 1) * limit;

  const cacheKey = `posts:${userId || "all"}:${
    catName || "all"
  }:page:${page}:limit:${limit}`;

  try {
    const cachedPosts = await getCache(cacheKey);
    if (cachedPosts) return res.status(200).json(cachedPosts);

    let query = {};
    if (userId) query.userId = userId;
    if (catName) query.categories = { $in: [catName] };

    const posts = await Post.find(query)
      .select("title photo userId createdAt views")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("userId", "username email photo socialLinks");

    const formattedPosts = posts.map((post) => ({
      ...post._doc,
      author: post.userId || { username: "Unknown" },
    }));
    const totalPosts = await Post.countDocuments(query);
    const hasMore = skip + limit < totalPosts;

    const response = { posts: formattedPosts, hasMore };
    await setCache(cacheKey, response, 60);

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;
