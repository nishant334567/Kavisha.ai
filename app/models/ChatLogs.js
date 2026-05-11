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
    /** Assistant messages only; user liked state (toggle). */
    liked: {
      type: Boolean,
      default: false,
    },
    /** Assistant messages only; set true first time user copies (stays true; analytics). */
    copied: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

LogsSchema.index({ sessionId: 1 });
LogsSchema.index({ sessionId: 1, createdAt: 1 });

const Logs = mongoose.models.Logs || mongoose.model("Logs", LogsSchema);
module.exports = Logs;
