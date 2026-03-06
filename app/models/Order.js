const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    brand: { type: String, required: true },
    orderId: { type: String, required: true },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    productSnapshot: {
      name: { type: String, default: "" },
      description: { type: String, default: "" },
      price: { type: Number, default: 0 },
      discountPercentage: { type: Number, default: 0 },
      images: { type: [String], default: [] },
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Phone and address from checkout (User table doesn't have these)
    shippingPhone: { type: String, default: "" },
    shippingAddress: { type: String, default: "" },
    orderStatus: {
      type: String,
      enum: ["pending", "in progress", "completed", "cancelled"],
      default: "pending",
    },
    paymentMethod: { type: String, default: "" },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    razorpayOrderId: { type: String, default: "" },
    razorpayPaymentId: { type: String, default: "" },
    deliveryDate: { type: Date },
    quantity: { type: Number, default: 1 },
    totalAmount: { type: Number, required: true },
  },
  { timestamps: true }
);

OrderSchema.index({ brand: 1 });
OrderSchema.index({ customerId: 1 });

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
module.exports = Order;
