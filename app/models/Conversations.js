const mongoose = require("mongoose");
const ConversationSchema = new mongoose.Schema(
  {
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    connectionId: {
      type: String,
      unique: true,
      required: true,
    },
    /** When set, this user may not send messages in this thread (e.g. admin closed the conversation for the end user). */
    blockedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    /** Set when the blocked user asks to chat again; cleared when admin reopens or re-closes. */
    reopenRequestedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Conversations ||
  mongoose.model("Conversations", ConversationSchema);
