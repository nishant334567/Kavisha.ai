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
  },
  { timestamps: true }
);

LogsSchema.index({ sessionId: 1 });

const Logs = mongoose.models.Logs || mongoose.model("Logs", LogsSchema);
module.exports = Logs;
