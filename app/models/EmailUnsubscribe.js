import mongoose from "mongoose";

const EmailUnsubscribeSchema = new mongoose.Schema(
  {
    avatarId: { type: String, default: null },
    email: { type: String, required: true, trim: true, lowercase: true },
    brand: { type: String, required: true, trim: true, index: true },
    unsubscribedAt: { type: Date, default: () => new Date() },
    reason: { type: String, default: null },
  },
  { timestamps: true }
);

EmailUnsubscribeSchema.index({ brand: 1, email: 1 }, { unique: true });

const EmailUnsubscribe =
  mongoose.models.EmailUnsubscribe ||
  mongoose.model("EmailUnsubscribe", EmailUnsubscribeSchema);

export default EmailUnsubscribe;
