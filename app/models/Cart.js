const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, default: 1, min: 1 },
    priceSnapshot: { type: Number, required: true },
  },
  { _id: false }
);

const CartSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    brand: { type: String, required: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true }
);

CartSchema.index({ userId: 1, brand: 1 }, { unique: true });

const Cart = mongoose.models.Cart || mongoose.model("Cart", CartSchema);
module.exports = Cart;
