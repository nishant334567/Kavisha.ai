import mongoose from "mongoose";

const MatchesSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatSessions",
    required: true,
  },
  matchedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  matchedSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ChatSessions",
    required: true,
  },
  matchingReason: { type: String },
  contacted: { type: Boolean, default: false },
  matchPercentage: { type: String, default: false },
  mismatchReason: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const Matches =
  mongoose.models.Matches || mongoose.model("Matches", MatchesSchema);
export default Matches;
