const router = require("express").Router();
const Post = require("../models/Post");

//for creating new post

//when we are creatin then it should have "post" method.
//for fetching the data we can use get
router.post("/", async (req, res) => {
  const { title, desc, photo, username } = req.body;

  if (!title || !desc || !username) {
    return res
      .status(400)
      .json({ message: "Title, description, and username are required." });
  }

  const newPost = new Post({ title, desc, photo, username });

  try {
    const savedPost = await newPost.save();
    res.status(200).json(savedPost);
  } catch (error) {
    res.status(500).json({ message: "Failed to save post", error });
  }
});

// here status 500 means that something is wrong with the mongoDB

//req is what we are sending to the server, and res what we are getting from the server
// while doing asynch operation use try and catch block

//for Update new post
router.put("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post.username !== req.body.username) {
      return res.status(401).json("You can update only your post.");
    }

    const { title, desc, photo, username } = req.body;

    // Basic validation
    if (!title || !desc || !username) {
      return res
        .status(400)
        .json("Title, description, and username are required.");
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      {
        $set: { title, desc, photo, username },
      },
      { new: true }
    );

    res.status(200).json(updatedPost);
  } catch (error) {
    res.status(500).json(error);
  }
});

//for delete  post
router.delete("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post.username === req.body.username) {
      try {
        await post.delete();
        res.status(200).json("Post has been deleted");
      } catch (err) {
        res.status(500).json(err);
      }
    } else {
      res.status(401).json("you can only delete your post....");
    }
  } catch (error) {
    res.status(500).json(error);
  }
});

//get post by id

router.get("/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json(error);
  }
});

//search Post by post title
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
      .select("title") // only title is needed; _id is included by default
      .limit(limit);

    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json(error);
  }
});

//get all post

router.get("/", async (req, res) => {
  const username = req.query.user;
  const catName = req.query.cat;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 3;
  const skip = (page - 1) * limit;

  try {
    let postsQuery;

    if (username) {
      postsQuery = Post.find({ username });
    } else if (catName) {
      postsQuery = Post.find({ categories: { $in: [catName] } });
    } else {
      postsQuery = Post.find();
    }

    const posts = await postsQuery
      .select("title photo username createdAt") // Only select required fields
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments();
    const hasMore = skip + limit < totalPosts;

    res.status(200).json({ posts, hasMore });
  } catch (error) {
    res.status(500).json(error);
  }
});

module.exports = router;

//for Deleting user

module.exports = router;
