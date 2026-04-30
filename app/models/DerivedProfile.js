const mongoose = require("mongoose");
const { Schema } = mongoose;

const DerivedProfileSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "ChatSessions",
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      index: true,
    },

    source: {
      type: String,
      default: "direct",
      index: true,
    },

    summary: { type: String, default: "" },

    embedding: { type: [Number], required: false },

    payload: { type: Schema.Types.Mixed, default: {} },

    sourceHash: { type: String, default: "", index: true },

    enrichmentStatus: {
      type: String,
      enum: ["pending", "running", "completed", "failed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

DerivedProfileSchema.index({ userId: 1, type: 1, updatedAt: -1 });
DerivedProfileSchema.index({ source: 1, type: 1, updatedAt: -1 });

const DerivedProfile =
  mongoose.models.DerivedProfile ||
  mongoose.model("DerivedProfile", DerivedProfileSchema);

module.exports = DerivedProfile;

