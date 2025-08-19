import mongoose from "mongoose";
const ConversationSchema = new mongoose.Schema(
  {
    sessionA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSessions",
      required: true,
    },
    sessionB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatSessions",
      required: true,
    },
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
  },
  { timestamps: true }
);

export default mongoose.models.Conversations ||
  mongoose.model("Conversations", ConversationSchema);
