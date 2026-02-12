const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String, required: true, unique: true },
    payerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    type: { type: String, required: true }, // e.g. "community_connect", "subscription", "course"
    metadata: { type: mongoose.Schema.Types.Mixed }, // product-specific: { targetUserId }, { planId }, etc.
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Payment || mongoose.model("Payment", PaymentSchema);
