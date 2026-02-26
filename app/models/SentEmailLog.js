import mongoose from "mongoose";

const SentEmailLogSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true, trim: true, lowercase: true, index: true },
    toEmail: { type: String, required: true, trim: true, lowercase: true, index: true },
    subject: { type: String, required: true, trim: true },
    type: { type: String, default: "bulk", trim: true, index: true },
    sentAt: { type: Date, default: () => new Date(), index: true },
    status: { type: String, required: true, enum: ["sent", "failed"], default: "sent", index: true },
  },
  { timestamps: true }
);

SentEmailLogSchema.index({ brand: 1, sentAt: -1 });
SentEmailLogSchema.index({ brand: 1, toEmail: 1, sentAt: -1 });
SentEmailLogSchema.index({ brand: 1, status: 1 });

const SentEmailLog =
  mongoose.models.SentEmailLog ||
  mongoose.model("SentEmailLog", SentEmailLogSchema);

export default SentEmailLog;
