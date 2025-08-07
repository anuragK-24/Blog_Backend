const mongoose = require("mongoose");
const sanitizeHtml = require("sanitize-html");

const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 100,
      set: (val) => sanitizeHtml(val),
    },
    desc: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20000,
      set: (val) =>
        sanitizeHtml(val, {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat([
            "img", "h1", "h2", "h3", "mark", "code", "pre",
            "strong", "em", "b", "i", "u", "ul", "ol", "li", "a", "p", "br",
          ]),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            img: ["src", "alt"],
            a: ["href", "title", "target"],
          },
          allowedSchemes: ["http", "https", "mailto"],
        }),
    },
    photo: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    views: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", PostSchema);
