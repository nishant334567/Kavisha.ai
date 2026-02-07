const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, //check if github return email id or not
    },
    image: {
      type: String,
    },
    profileType: {
      type: String,
      enum: ["job_seeker", "recruiter", "male", "female"],
      required: false,
    },
    remainingCredits: { type: Number, default: 3 },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    hasCreatedAvatar: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);
module.exports = User;
