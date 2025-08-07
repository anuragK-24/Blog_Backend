const mongoose = require("mongoose");
const sanitizeHtml = require("sanitize-html");
const validator = require("validator");

const cleanString = (val) =>
  typeof val === "string" ? sanitizeHtml(val.trim()) : "";

const cleanLower = (val) =>
  typeof val === "string" ? sanitizeHtml(val.trim().toLowerCase()) : "";

const isValidURL = (val) =>
  !val || validator.isURL(val, { protocols: ["http", "https"], require_protocol: true });

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 100,
      validate: {
        validator: validator.isEmail,
        message: "Invalid email format",
      },
      set: cleanLower,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 50,
      set: cleanLower,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 6,
      maxlength: 2024,
    },
    techSkills: {
      type: [String],
      default: [],
      set: (skills) => {
        if (typeof skills === "string") {
          return skills
            .split(",")
            .map(cleanString)
            .filter(Boolean);
        } else if (Array.isArray(skills)) {
          return skills
            .map((skill) => (typeof skill === "string" ? cleanString(skill) : ""))
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
      set: cleanString,
    },
    about: {
      type: String,
      default: "",
      maxlength: 1000,
      set: cleanString,
    },

    // 🌐 Social Links with URL validation
    github: {
      type: String,
      default: "",
      maxlength: 300,
      validate: {
        validator: isValidURL,
        message: "Invalid GitHub URL",
      },
      set: cleanString,
    },
    linkedin: {
      type: String,
      default: "",
      maxlength: 300,
      validate: {
        validator: isValidURL,
        message: "Invalid LinkedIn URL",
      },
      set: cleanString,
    },
    website: {
      type: String,
      default: "",
      maxlength: 300,
      validate: {
        validator: isValidURL,
        message: "Invalid Website URL",
      },
      set: cleanString,
    },
    twitter: {
      type: String,
      default: "",
      maxlength: 300,
      validate: {
        validator: isValidURL,
        message: "Invalid Twitter URL",
      },
      set: cleanString,
    },
    instagram: {
      type: String,
      default: "",
      maxlength: 300,
      validate: {
        validator: isValidURL,
        message: "Invalid Instagram URL",
      },
      set: cleanString,
    },
    youtube: {
      type: String,
      default: "",
      maxlength: 300,
      validate: {
        validator: isValidURL,
        message: "Invalid YouTube URL",
      },
      set: cleanString,
    },
  },
  { timestamps: true }
);

// Add indexes for performance
UserSchema.index({ username: 1 });
UserSchema.index({ email: 1 });

module.exports = mongoose.model("User", UserSchema);
