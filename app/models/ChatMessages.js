const mongoose = require("mongoose");

const ChatMessageSchema = new mongoose.Schema(
  {
    connectionId: { type: String, index: true, required: true },
    senderSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiverSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

module.exports = mongoose.models.ChatMessages ||
  mongoose.model("ChatMessages", ChatMessageSchema);
