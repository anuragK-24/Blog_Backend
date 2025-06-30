const router = require("express").Router();
const bcrypt = require("bcrypt");
const User = require("../models/User");
const validator = require("validator");

router.put("/:id", async (req, res) => {
  if (req.body.userId !== req.params.id) {
    return res.status(401).json("You can update only your account");
  }

  try {
    const updates = {};
    const { username, email, password } = req.body;

    if (username) {
      if (typeof username !== "string" || username.trim().length < 3) {
        return res
          .status(400)
          .json("Username must be at least 3 characters long.");
      }
      updates.username = username;
    }

    if (email) {
      if (!validator.isEmail(email)) {
        return res.status(400).json("Invalid email format.");
      }
      updates.email = email;
    }

    if (password) {
      if (password.length < 6 || password.length > 64) {
        return res
          .status(400)
          .json("Password must be 6 to 64 characters long.");
      }
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(password, salt);
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
