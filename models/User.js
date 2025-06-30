const mongoose = require("mongoose");
const sanitizeHtml = require("sanitize-html");

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    maxlength: 100,
    set: (val) => sanitizeHtml(val),
  },
  username: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
    lowercase: true,
    set: (val) => sanitizeHtml(val),
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    maxlength: 2024,
    trim: true,
  },
});

module.exports = mongoose.model("User", UserSchema);
