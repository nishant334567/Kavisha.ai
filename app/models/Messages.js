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
