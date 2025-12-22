const mongoose = require("mongoose");

const ChatSessionsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
    isCommunityChat: {
      type: Boolean,
      default: false,
    },
    brand: {
      type: String,
      required: true,
      default: "kavisha",
    },
    resumeSummary: {
      type: String,
      required: false,
    },
    resumeFilename: {
      type: String,
      required: false,
    },
    chatSummary: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: false,
    },
    allDataCollected: {
      type: Boolean,
      default: false,
    },
    embedding: {
      type: [Number],
      required: false,
    },
    status: {
      type: String,
      default: "in-progress",
    },
    comment: {
      type: String,
      default: "",
    },
    assignedTo: {
      type: String,
      default: "",
    },
    totalInputTokens: {
      type: Number,
      default: 0,
    },
    totalOutputTokens: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true, // This automatically adds createdAt and updatedAt fields
  }
);

// Add indexes for better performance
ChatSessionsSchema.index({ role: 1 });
ChatSessionsSchema.index({ allDataCollected: 1 });
ChatSessionsSchema.index({ embedding: 1 });
ChatSessionsSchema.index({ createdAt: -1 });

const Session =
  mongoose.models.ChatSessions ||
  mongoose.model("ChatSessions", ChatSessionsSchema);
module.exports = Session;
