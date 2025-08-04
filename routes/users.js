const router = require("express").Router();
const bcrypt = require("bcrypt");
const User = require("../models/User");
const validator = require("validator");
const Post = require("../models/Post");

router.get("/:id/stats", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json("User not found");

    const posts = await Post.find({ username: user.username }).select(
      "title createdAt views"
    );

    res.status(200).json(posts);
  } catch (err) {
    console.error("Failed to fetch user's blogs:", err);
    res.status(500).json("Server error while fetching blogs");
  }
});

router.put("/:id", async (req, res) => {
  if (req.body.userId !== req.params.id) {
    return res.status(401).json("You can update only your account");
  }

  try {
    const updates = {};
    const { username, email, techSkills, photo, about } = req.body;

    if (username) {
      if (typeof username !== "string" || username.trim().length < 3) {
        return res.status(400).json("Username must be at least 3 characters long.");
      }
      updates.username = username.trim();
    }

    if (email) {
      if (!validator.isEmail(email)) {
        return res.status(400).json("Invalid email format.");
      }
      updates.email = email.toLowerCase();
    }

    if (techSkills !== undefined) {
      if (!Array.isArray(techSkills)) {
        return res.status(400).json("Tech skills must be an array.");
      }
      updates.techSkills = techSkills;
    }

    if (photo !== undefined) {
      updates.photo = photo;
    }

    if (about !== undefined) {
      updates.about = about;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true }
    );

    res.status(200).json(updatedUser);
  } catch (err) {
    console.error("User update failed:", err);
    res.status(500).json("Server error while updating user");
  }
});


// here status 500 means that something is wrong with the mongoDB

//req is what we are sending to the server, and res what we are getting from the server
// while doing asynch operation use try and catch block

//for Deleting user
router.delete("/:id", async (req, res) => {
  if (req.body.userId === req.params.id) {
    try {
      const user = await User.findById(req.params.id);
      try {
        await Post.deleteMany({ username: user.username });
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json("User has been deleted ...");
      } catch (err) {
        res.status(500).json(err);
      }
    } catch (error) {
      res.status(404).json("User not found ");
    }
  } else {
    res.status(401).json("you can delete only your account  ");
  }
});

//get user
router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    const { password, ...others } = user._doc;

    res.status(200).json(others);
  } catch (error) {
    res.status(500).json(err);
  }
});
module.exports = router;
