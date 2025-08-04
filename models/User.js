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
      set: (val) => sanitizeHtml(val.trim().toLowerCase()),
    },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 50,
      set: (val) => sanitizeHtml(val.trim().toLowerCase()),
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
        } else if (Array.isArray(skills)) {
          return skills
            .map((skill) =>
              typeof skill === "string" ? sanitizeHtml(skill.trim()) : ""
            )
            .filter(Boolean);
        }
        return [];
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
      set: (val) => (val ? sanitizeHtml(val.trim()) : ""),
    },
    about: {
      type: String,
      default: "",
      maxlength: 1000,
      set: (val) => sanitizeHtml(val.trim()),
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
