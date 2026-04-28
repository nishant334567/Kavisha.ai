const mongoose = require("mongoose");
const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
    },
    /** Optional metadata: enables "Brand thread" UX while showing admin name per message. */
    senderRole: {
      type: String,
      default: null,
    },
    senderName: {
      type: String,
      default: null,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Messages =
  mongoose.models.Messages || mongoose.model("Messages", MessageSchema);
module.exports = Messages;
