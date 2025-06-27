import mongoose from "mongoose";

const LogsSchema = new mongoose.Schema(
  {
    message: {
      type: String,
      required: true,
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

const Logs = mongoose.models.Logs || mongoose.model("Logs", LogsSchema);
export default Logs;
