// Import required modules
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("./models/User");

// Initialize the express app
const app = express();
dotenv.config();

// Middleware setup
app.use(express.json());
app.use(
  cors({
    origin: "https://blogspark-anuragk24.vercel.app", // Your frontend
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Handle preflight requests
app.options("*", cors());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URL, { useNewUrlParser: true })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log(err));

// Google OAuth2 client setup
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Routes
const authRoute = require("./routes/auth");
const userRoute = require("./routes/users");
const postRoute = require("./routes/posts");

// Use routes
app.use("/api/auth", authRoute);
app.use("/api/users", userRoute);
app.use("/api/posts", postRoute);

// Google Login Route
app.post("/api/auth/google-login", async (req, res) => {
  const { token } = req.body;

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload;

    // Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // Generate a random password
      const randomPassword = crypto.randomBytes(8).toString("hex");
      const salt = await bcrypt.genSalt(10);
      const hashedPass = await bcrypt.hash(randomPassword, salt);

      user = new User({
        username: name,
        email,
        password: hashedPass,
      });

      await user.save();
    }

    res.status(200).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error in Google Login:", error);
    res.status(401).json({ error: "Google token invalid" });
  }
});

// Start the server
app.listen(5000, () => {
  console.log("Backend is running on http://localhost:5000");
});
