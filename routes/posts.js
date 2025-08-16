const router = require("express").Router();
const verifyToken = require("../middleware/verifyToken");
const verifyCronJob = require("../middleware/verifyCronJob");
const Post = require("../models/Post");
const User = require("../models/User");


// Cleanup route: short desc + older than 1 day
router.delete("/cleanup", verifyCronJob, async (req, res) => {
  try {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const result = await Post.deleteMany({
      $and: [
        { $expr: { $lte: [{ $strLenCP: "$desc" }, 150] } },
        // { createdAt: { $lte: oneDayAgo } }
      ]
    });

    res.status(200).json({
      message: `Cleanup complete. ${result.deletedCount} post(s) removed.`,
    });
  } catch (error) {
    console.error("Error during cleanup:", error);
    res.status(500).json({ message: "Internal server error during cleanup" });
  }
});




// Get the blog post with the maximum views
router.get("/top", async (req, res) => {
  try {
    const post = await Post.findOne()
      .sort({ views: -1 }) // Highest views   
      .limit(1)
      .select("_id title photo userId") // Only required fields from Post
      .populate("userId", "username"); // Only username from User

    if (!post) {
      return res.status(404).json({ message: "No posts found" });
    }

    const postData = {
      postId: post._id,
      postName: post.title,
      postPhoto: post.photo,
      datePublished: post.createdAt,
      authorName: post.userId?.username || "Unknown",
    };

    res.status(200).json(postData);
  } catch (error) {
    console.error("Error fetching most viewed post:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Create a new post
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

// Update a post
router.put("/:id",verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.userId.toString() !== req.body.userId) {
      return res.status(401).json("You can update only your post.");
    }

    const { title, desc, photo } = req.body;

    if (!title || !desc) {
      return res.status(400).json("Title and description are required.");
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      { $set: { title, desc, photo } },
      { new: true }
    );

    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json(error);
  }
});

// Delete a post
router.delete("/:id",verifyToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.userId.toString() !== req.body.userId) {
      return res.status(401).json("You can delete only your post.");
    }

    await post.delete();
    res.status(200).json("Post has been deleted");
  } catch (error) {
    res.status(500).json(error);
  }
});

// Get a post by ID (increment views if viewer isn't the author)
router.get("/:id", async (req, res) => {
  try {
    const { userId: viewerId } = req.query;

    const post = await Post.findById(req.params.id).populate(
      "userId",
      "username email photo github linkedin website twitter instagram youtube"
    );

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const authorId = String(post.userId?._id);

    // Increment views if viewer is not the author or not logged in
    if (viewerId === undefined || viewerId !== authorId) {
      post.views = (post.views || 0) + 1;
      await post.save();
    }

    const postWithAuthor = {
      ...post._doc,
      author: post.userId || { username: "Unknown" },
    };

    res.status(200).json(postWithAuthor);
  } catch (error) {
    console.error("Error in GET /:id", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Search posts by title
router.get("/search/:query", async (req, res) => {
  const searchQuery = req.params.query;
  const limit = 4;

  try {
    if (!searchQuery) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const posts = await Post.find({
      title: { $regex: searchQuery, $options: "i" },
    })
      .select("title")
      .limit(limit);

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json(error);
  }
});

// Get all posts with optional filters and pagination
router.get("/", async (req, res) => {
  const userId = req.query.userId;
  const catName = req.query.cat;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 3;
  const skip = (page - 1) * limit;

  try {
    let query = {};
    if (userId) {
      query.userId = userId;
    }
    if (catName) {
      query.categories = { $in: [catName] };
    }

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

    res.status(200).json({ posts: formattedPosts, hasMore });
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;
