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
    /** Sessions started from the embed widget */
    isWidget: {
      type: Boolean,
      default: false,
    },
    /** Private job requirement chat created from the Jobs page (not community) */
    isJobsRequirementPost: {
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
    /** Rolling summary maintenance: pending log messages since last summary update (user+assistant). */
    summaryPendingCount: {
      type: Number,
      default: 0,
    },
    /** Last time `chatSummary` was generated/refreshed. */
    summaryUpdatedAt: {
      type: Date,
      required: false,
    },
    title: {
      type: String,
      required: false,
    },
    name: {
      type: String,
      required: false,
    },
    serviceKey: {
      type: String,
      required: false,
    },
    allDataCollected: {
      type: Boolean,
      default: false,
    },
    /** Last model-reported onboarding completion 0–100 (part 5 of /api/ai) */
    onboardingPercent: {
      type: Number,
      default: 0,
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
      type: [String],
      default: [],
    },
    totalInputTokens: {
      type: Number,
      default: 0,
    },
    totalOutputTokens: {
      type: Number,
      default: 0,
    },
    /** Daily community match digest: last time an email was successfully sent */
    communityMatchDigestLastSentAt: {
      type: Date,
      required: false,
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
ChatSessionsSchema.index({
  userId: 1,
  brand: 1,
  isJobsRequirementPost: 1,
  createdAt: -1,
});

const Session =
  mongoose.models.ChatSessions ||
  mongoose.model("ChatSessions", ChatSessionsSchema);
module.exports = Session;
