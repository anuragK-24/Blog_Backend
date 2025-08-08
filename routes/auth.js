// routes/auth.js
const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const validator = require("validator");
const jwt = require("jsonwebtoken");

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json("All fields are required.");
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json("Invalid email format.");
    }

    if (password.length < 6 || password.length > 64) {
      return res.status(400).json("Password must be 6 to 64 characters long.");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json("Email already in use.");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(password, salt);

    const newUser = new User({ username, email, password: hashedPass });
    await newUser.save();

    res.status(200).json({ message: "User registered successfully." });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json("Server error during registration.");
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json("Email and password are required.");
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json("Wrong credentials!");

    const validated = await bcrypt.compare(password, user.password);
    if (!validated) return res.status(400).json("Wrong credentials!");

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const { password: pass, ...others } = user._doc;

    res.status(200).json({ user: others, token });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json("Server error during login.");
  }
});

module.exports = router;
