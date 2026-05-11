const mongoose = require("mongoose");

const LogsSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
    },
    altMessage: {
      type: String,
      default: "",
    },
    sourceUrls: {
      type: [String],
      default: [],
    },
    /** KB-backed title/description per URL; legacy logs omit this (use sourceUrls links only). */
    sourceCards: {
      type: [
        {
          url: { type: String, required: true },
          title: { type: String, default: "" },
          description: { type: String, default: "" },
        },
      ],
      default: [],
    },
    sourceChunkIds: {
      type: [String],
      default: [],
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSessions",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    /** Assistant messages only; incremented when user likes this answer. */
    likeCount: {
      type: Number,
      default: 0,
    },
    /** Assistant messages only; incremented when user shares this answer. */
    shareCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

LogsSchema.index({ sessionId: 1 });
LogsSchema.index({ sessionId: 1, createdAt: 1 });

const Logs = mongoose.models.Logs || mongoose.model("Logs", LogsSchema);
module.exports = Logs;
