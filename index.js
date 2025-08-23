// Import required modules
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { OAuth2Client } = require("google-auth-library");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const User = require("./models/User");
// const verifyToken = require("./middleware/verifyToken");


// Initialize the express app
const app = express();
dotenv.config();

// Middleware setup
app.use(express.json());
app.use(
  cors({
    origin: "https://blogspark-anuragk24.vercel.app/",
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



app.post("/api/auth/google-login", async (req, res) => {
  const { token } = req.body;
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, email, name, picture } = ticket.getPayload();

    let user = await User.findOne({ email });
    if (!user) {
      const randomPassword = crypto.randomBytes(8).toString("hex");
      const salt = await bcrypt.genSalt(10);
      const hashedPass = await bcrypt.hash(randomPassword, salt);

      user = new User({
        username: name,
        email,
        password: hashedPass,
        photo: picture,
      });
      await user.save();
    }

    // Create JWT
    const accessToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Exclude password from user object
    const { password, ...userWithoutPassword } = user._doc;

    res.status(200).json({
      user: userWithoutPassword,
      token: accessToken,
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
