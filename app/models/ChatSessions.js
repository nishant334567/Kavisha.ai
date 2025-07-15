import mongoose from "mongoose";

const ChatSessionsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  role: {
    type: String,
    enum: ["job_seeker", "recruiter"],
    required: true,
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
  startedAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ["active", "completed"],
    default: "active",
  },
  allDataCollected: {
    type: Boolean,
    default: false,
  },


});
const Session =
  mongoose.models.ChatSessions ||
  mongoose.model("ChatSessions", ChatSessionsSchema);
export default Session;
