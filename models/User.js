const mongoose = require("mongoose");
const sanitizeHtml = require("sanitize-html");

const UserSchema = new mongoose.Schema(
  {
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
    techSkills: {
      type: [String],
      default: [],
      set: (skills) => {
        if (typeof skills === "string") {
          return skills
            .split(",")
            .map((skill) => sanitizeHtml(skill.trim()))
            .filter(Boolean);
        }
        return Array.isArray(skills)
          ? skills.map((skill) => sanitizeHtml(skill))
          : [];
      },
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      default: "Other",
    },
    photo: {
      type: String,
      default: "",
      set: (val) => sanitizeHtml(val),
    },
    about: {
      type: String,
      default: "",
      maxlength: 1000,
      set: (val) => sanitizeHtml(val),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
